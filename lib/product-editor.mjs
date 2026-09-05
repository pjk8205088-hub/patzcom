import crypto from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { saveCatalogSnapshot } from './catalog-pages.mjs';

const catalog = path.resolve('work/abc11-site_1/site/assets/products.json');
let pending = Promise.resolve();
const escape = value => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const revision = items => crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
export async function readEditorCatalog() {
  const items = JSON.parse(await readFile(catalog, 'utf8'));
  return { items, revision: revision(items) };
}

export async function uploadProductImage(payload) {
  if (typeof payload?.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.base64)) throw new Error('Invalid image data.');
  const bytes = Buffer.from(payload.base64, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Image must be at most 5 MB.');
  let extension;
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg';
  if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') extension = 'webp';
  if (!extension) throw new Error('Only JPEG, PNG and WebP photos are supported.');
  const relative = `assets/img/upload-${crypto.randomUUID()}.${extension}`;
  const destination = path.resolve('work/abc11-site_1/site', relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: 'wx' });
  return relative;
}

export function validateProduct(input, existing, items) {
  if (!input || typeof input !== 'object') throw new Error('Product is required.');
  const product = existing ? { ...existing } : {
    id: `patz-${crypto.randomUUID()}`, currency: 'USD', listingSite: 'US', tags: [], grams: 0, compare: null,
  };
  if (!existing) product.handle = product.id;
  for (const field of ['title', 'sku', 'vendor', 'type']) {
    if (typeof input[field] !== 'string' || input[field].length > 300) throw new Error(`Invalid ${field}.`);
    product[field] = input[field].trim();
  }
  if (!product.title || !product.type) throw new Error('Title and category are required.');
  if (product.sku && items.some(item => item.id !== product.id && String(item.sku || '').toLowerCase() === product.sku.toLowerCase())) throw new Error('This SKU already exists. Edit the existing product instead.');
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price <= 0 || input.price > 1000000) throw new Error('Enter a valid USD price.');
  product.price = Math.round(input.price * 100) / 100;
  if (typeof input.available !== 'boolean') throw new Error('Availability is required.');
  product.available = input.available;
  if (!Array.isArray(input.images) || input.images.length > 30) throw new Error('Use up to 30 images.');
  product.images = [...new Set(input.images.map(value => {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid image URL.');
    const url = value.trim();
    if (/^assets\/img\/[a-zA-Z0-9._-]+$/.test(url)) return url;
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Image must be an HTTPS URL.'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || /[<>"']/.test(url)) throw new Error('Image must be a safe HTTPS URL.');
    return url;
  }))];
  if (typeof input.desc_text !== 'string' || input.desc_text.length > 100000) throw new Error('Description is too long.');
  // Preserve imported videos and rich descriptions unless the seller edits the text.
  if (!existing || input.desc_text !== existing.desc_text) {
    product.desc_text = input.desc_text;
    product.desc_html = `<div style="white-space:pre-wrap">${escape(input.desc_text)}</div>`;
  }
  return product;
}

export function saveEditorProduct(payload) {
  const operation = pending.then(async () => {
    const { items, revision: current } = await readEditorCatalog();
    if (payload.revision !== current) throw new Error('Catalog changed. Reload before saving.');
    const index = payload.id ? items.findIndex(item => item.id === payload.id) : -1;
    if (payload.id && index < 0) throw new Error('Product not found.');
    const product = validateProduct(payload.product, items[index], items);
    const next = [...items];
    if (index < 0) next.push(product); else next[index] = product;
    const backupDir = path.resolve('data/catalog-backups');
    await mkdir(backupDir, { recursive: true });
    await writeFile(path.join(backupDir, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(items));
    try {
      await saveCatalogSnapshot(next, { deduplicate: false });
    } catch (error) {
      await saveCatalogSnapshot(items, { deduplicate: false });
      throw error;
    }
    return { product, revision: revision(next) };
  });
  pending = operation.catch(() => {});
  return operation;
}
