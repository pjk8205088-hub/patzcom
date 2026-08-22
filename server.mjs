import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAdminSnapshot,
  getIntegrationStatus,
  getProductsSummary,
  lookupOrder,
} from './lib/store-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, 'work', 'abc11-site_1', 'site');
const port = Number(process.env.PORT || 4173);

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

  if (pathname === '/api/admin/dashboard') {
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
