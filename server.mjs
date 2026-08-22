import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  getAdminSnapshot,
  getIntegrationStatus,
  getProductsSummary,
  lookupOrder,
} from './lib/store-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, 'work', 'abc11-site_1', 'site');
const port = Number(process.env.PORT || 4173);
const adminEmail = process.env.PATZCOM_ADMIN_EMAIL || 'partscombined@gmail.com';
const adminPassword = process.env.PATZCOM_ADMIN_PASSWORD || '1111';
const adminSessions = new Map();

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

function routePath(reqUrl) {
  return new URL(reqUrl || '/', 'http://127.0.0.1').pathname;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.normalize(path.join(siteRoot, requested));
  return resolved.startsWith(siteRoot) ? resolved : path.join(siteRoot, 'index.html');
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

  if (pathname === '/api/products') {
    try {
      const items = await getProductsSummary(24);
      return json(res, 200, { items });
    } catch (error) {
      return json(res, 500, { error: 'Unable to load products', detail: error.message });
    }
  }

  if (pathname === '/api/integrations/status') {
    return json(res, 200, getIntegrationStatus());
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

  if (pathname === '/api/orders/lookup') {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const query = url.searchParams.get('query') || '';
    return json(res, 200, await lookupOrder(query));
  }

  if (pathname === '/admin.html' && !adminSession) {
    res.statusCode = 302;
    res.setHeader('Location', '/admin-login.html');
    return res.end();
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
