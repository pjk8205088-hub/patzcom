import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  buildEbayConsentUrl,
  exchangeAuthorizationCode,
  getEbayConfig,
  readStoredEbayTokens,
  refreshUserAccessToken,
} from './lib/ebay-oauth.mjs';
import {
  getAdminSnapshot,
  getIntegrationStatus,
  getProductsSummary,
  lookupOrder,
  clearProductCache,
} from './lib/store-api.mjs';
import {
  normalizeCatalogPayload,
  saveCatalogSnapshot,
} from './lib/catalog-pages.mjs';
import {
  enrichProductsWithBrowseImages,
  fetchBrowseApi,
  hasEbayBrowseCredentials,
  isBrowseApiUrl,
} from './lib/ebay-browse.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, 'work', 'abc11-site_1', 'site');
const port = Number(process.env.PORT || 4173);
const adminEmail = process.env.PATZCOM_ADMIN_EMAIL || 'partscombined@gmail.com';
const adminPassword = process.env.PATZCOM_ADMIN_PASSWORD || '1111';
const adminSessions = new Map();
const pendingEbayStates = new Map();
const REMOTE_SOURCE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'api.github.com',
  'github.com',
  'gist.githubusercontent.com',
  'api.ebay.com',
  'api.sandbox.ebay.com',
]);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.patzcom_admin_session;
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    adminSessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `patzcom_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'patzcom_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

function routePath(reqUrl) {
  return new URL(reqUrl || '/', 'http://127.0.0.1').pathname;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.normalize(path.join(siteRoot, requested));
  return resolved.startsWith(siteRoot) ? resolved : path.join(siteRoot, 'index.html');
}

function isAllowedRemoteSource(url) {
  return url?.protocol === 'https:' && REMOTE_SOURCE_HOSTS.has(url.hostname);
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Unable to parse ${label} JSON payload: ${error.message}`);
  }
}

async function loadRemoteCatalogPayload(sourceUrl) {
  const url = new URL(sourceUrl);
  if (!isAllowedRemoteSource(url)) {
    throw new Error('Only GitHub and eBay source URLs are allowed.');
  }

  const ebayConfig = getEbayConfig();
  if (isBrowseApiUrl(url)) {
    if (ebayConfig.environment === 'sandbox' && url.hostname === 'api.ebay.com') {
      throw new Error('eBay environment is sandbox but the provided URL points to production. Use the sandbox API URL or switch EBAY_ENV.');
    }
    return fetchBrowseApi(url);
  }

  const headers = {
    Accept: 'application/vnd.github.raw+json, application/json',
    'User-Agent': 'PATZCOM-Catalog-Sync/1.0',
  };

  if (url.hostname.includes('ebay.com')) {
    const storedTokens = await readStoredEbayTokens();
    let accessToken = storedTokens?.accessToken || process.env.EBAY_ACCESS_TOKEN || '';
    const expiresAt = storedTokens?.accessTokenExpiresAt ? Date.parse(storedTokens.accessTokenExpiresAt) : 0;
    if ((!accessToken || (expiresAt && Date.now() >= expiresAt)) && (storedTokens?.refreshToken || process.env.EBAY_REFRESH_TOKEN)) {
      const refreshed = await refreshUserAccessToken();
      accessToken = refreshed.accessToken;
    }
    if (!accessToken) {
      throw new Error('No eBay access token available. Complete the OAuth consent flow first.');
    }
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`Remote source request failed with ${response.status} ${response.statusText}`);
  }

  return readJsonResponse(response, url.hostname);
}

const server = http.createServer(async (req, res) => {
  const pathname = routePath(req.url);
  const adminSession = getAdminSession(req);

  if (pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      service: 'patzcom-storefront',
      date: new Date().toISOString(),
    });
  }

  if (pathname === '/admin.html' && !adminSession) {
    return redirect(res, '/admin-login.html');
  }

  if (pathname === '/api/products') {
    try {
      const items = await getProductsSummary(24);
      return json(res, 200, { items });
    } catch (error) {
      return json(res, 500, { error: 'Unable to load products', detail: error.message });
    }
  }

  if (pathname === '/api/integrations/status') {
    return json(res, 200, await getIntegrationStatus());
  }

  if (pathname === '/api/ebay/config') {
    const config = getEbayConfig();
    const storedTokens = await readStoredEbayTokens();
    return json(res, 200, {
      environment: config.environment,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      consentReady: Boolean(config.clientId && config.clientSecret && config.redirectUri && config.scopes.length),
      tokenStorePresent: Boolean(storedTokens),
      storedTokenUpdatedAt: storedTokens?.updatedAt || null,
    });
  }

  if (pathname === '/api/ebay/connect') {
    try {
      const state = crypto.randomBytes(18).toString('hex');
      pendingEbayStates.set(state, {
        createdAt: Date.now(),
        returnTo: '/admin.html?ebay=consent-started',
      });
      return redirect(res, buildEbayConsentUrl(state));
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message });
    }
  }

  if (pathname === '/api/ebay/callback') {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      return redirect(res, `/admin.html?ebay=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'User did not approve eBay consent.')}`);
    }

    const pending = state ? pendingEbayStates.get(state) : null;
    if (!state || !pending) {
      return redirect(res, '/admin.html?ebay=invalid-state');
    }

    pendingEbayStates.delete(state);

    if (!code) {
      return redirect(res, '/admin.html?ebay=missing-code');
    }

    try {
      await exchangeAuthorizationCode(code);
      const destination = pending?.returnTo || '/admin.html?ebay=connected';
      return redirect(res, destination);
    } catch (exchangeError) {
      return redirect(res, `/admin.html?ebay=token-exchange-failed&message=${encodeURIComponent(exchangeError.message)}`);
    }
  }

  if (pathname === '/api/admin/session') {
    return json(res, 200, {
      authenticated: Boolean(adminSession),
      user: adminSession ? { email: adminSession.email } : null,
    });
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (email !== adminEmail.toLowerCase() || password !== adminPassword) {
        return json(res, 401, { ok: false, message: 'Invalid admin email or password.' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      adminSessions.set(token, {
        email: adminEmail,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      });
      setSessionCookie(res, token);
      return json(res, 200, { ok: true, email: adminEmail });
    } catch (error) {
      return json(res, 400, { ok: false, message: 'Unable to process login request.', detail: error.message });
    }
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    if (adminSession?.token) adminSessions.delete(adminSession.token);
    clearSessionCookie(res);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/dashboard') {
    if (!adminSession) {
      return json(res, 401, { error: 'Admin login required' });
    }
    try {
      const snapshot = await getAdminSnapshot();
      return json(res, 200, snapshot);
    } catch (error) {
      return json(res, 500, { error: 'Unable to build admin snapshot', detail: error.message });
    }
  }

  if (pathname === '/api/admin/ebay/refresh' && req.method === 'POST') {
    if (!adminSession) {
      return json(res, 401, { error: 'Admin login required' });
    }
    try {
      const tokens = await refreshUserAccessToken();
      return json(res, 200, { ok: true, updatedAt: tokens.updatedAt, accessTokenExpiresAt: tokens.accessTokenExpiresAt });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message });
    }
  }

  if (pathname === '/api/admin/catalog/import' && req.method === 'POST') {
    if (!adminSession) {
      return json(res, 401, { error: 'Admin login required' });
    }
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      const items = normalizeCatalogPayload(payload);
      if (!items.length) {
        return json(res, 400, { ok: false, message: 'No catalog items found in the import payload.' });
      }
      await saveCatalogSnapshot(items);
      clearProductCache();
      return json(res, 200, { ok: true, count: items.length });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message });
    }
  }

  if (pathname === '/api/admin/catalog/import-source' && req.method === 'POST') {
    if (!adminSession) {
      return json(res, 401, { error: 'Admin login required' });
    }
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const sourceUrl = String(body.sourceUrl || '').trim();
      if (!sourceUrl) {
        return json(res, 400, { ok: false, message: 'Please provide a GitHub raw URL or eBay API URL.' });
      }
      const payload = await loadRemoteCatalogPayload(sourceUrl);
      const items = normalizeCatalogPayload(payload);
      if (!items.length) {
        return json(res, 400, { ok: false, message: 'No catalog items found in the remote payload.' });
      }
      await saveCatalogSnapshot(items);
      clearProductCache();
      return json(res, 200, {
        ok: true,
        count: items.length,
        sourceUrl,
        sourceHost: new URL(sourceUrl).hostname,
      });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message });
    }
  }

  if (pathname === '/api/admin/catalog/enrich-images' && req.method === 'POST') {
    if (!adminSession) {
      return json(res, 401, { error: 'Admin login required' });
    }
    try {
      if (!hasEbayBrowseCredentials()) {
        return json(res, 400, {
          ok: false,
          message: 'Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET before enriching images from the eBay Browse API.',
        });
      }

      const productsPath = path.join(siteRoot, 'assets', 'products.json');
      const raw = await readFile(productsPath, 'utf8');
      const products = JSON.parse(raw || '[]');
      if (!Array.isArray(products) || !products.length) {
        return json(res, 400, { ok: false, message: 'No products found in assets/products.json.' });
      }

      const body = JSON.parse(await readBody(req).catch(() => '{}') || '{}');
      const limit = Number(body.limit || process.env.EBAY_IMAGE_ENRICH_LIMIT || 0);
      const enrichment = await enrichProductsWithBrowseImages(products, {
        maxItems: Number.isFinite(limit) && limit > 0 ? limit : Infinity,
      });
      if (!enrichment.updated) {
        return json(res, 200, { ok: true, updated: 0, processed: enrichment.processed, message: 'No new images were found.' });
      }
      await saveCatalogSnapshot(products);
      clearProductCache();
      return json(res, 200, {
        ok: true,
        updated: enrichment.updated,
        processed: enrichment.processed,
      });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message });
    }
  }

  if (pathname === '/api/orders/lookup') {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const query = url.searchParams.get('query') || '';
    return json(res, 200, await lookupOrder(query));
  }

  let filePath = safePath(req.url || '/');
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(siteRoot, 'index.html');
  }

  res.setHeader('Content-Type', types[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  createReadStream(filePath)
    .on('error', () => {
      res.statusCode = 404;
      res.end('Not found');
    })
    .pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`PATZCOM storefront running on port ${port}`);
});
