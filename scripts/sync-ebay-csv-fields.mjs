import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';

const csvPath = process.argv[2] || process.env.EBAY_CSV_PATH;
if (!csvPath) throw new Error('Pass the eBay active listings CSV path.');

function parseCsv(source) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (row.length) { row.push(value); rows.push(row); }
  return rows;
}

const source = (await readFile(path.resolve(csvPath), 'utf8')).replace(/^\uFEFF/, '');
const rows = parseCsv(source);
const headers = rows.shift();
const column = name => headers.indexOf(name);
const ebay = new Map(rows.map(row => [row[column('Item number')], row]));
const catalogPath = path.resolve('work/abc11-site_1/site/assets/products.json');
const products = JSON.parse(await readFile(catalogPath, 'utf8'));
let matched = 0, changed = 0;
const changes = [];
const next = products.map(product => {
  const id = String(product.ebayItemId || product.id || '');
  const row = ebay.get(id);
  if (!row || row[column('Listing site')] !== 'US' || row[column('Currency')] !== 'USD') return product;
  matched += 1;
  const title = String(row[column('Title')] || '').trim();
  const sku = String(row[column('Custom label (SKU)')] || '').trim();
  const price = Number(row[column('Current price')]);
  if (!title || !Number.isFinite(price)) return product;
  const updated = { ...product, title, sku, price, currency: 'USD', listingSite: 'US' };
  if (title !== product.title || sku !== String(product.sku || '') || price !== Number(product.price)) {
    changed += 1;
    changes.push({ id, titleChanged: title !== product.title, skuChanged: sku !== String(product.sku || ''), priceChanged: price !== Number(product.price) });
  }
  return updated;
});

if (matched !== products.length) throw new Error(`Refusing partial sync: matched ${matched} of ${products.length} products.`);
await saveCatalogSnapshot(next, { deduplicate: false });
console.log(JSON.stringify({ csvRows: rows.length, catalogProducts: products.length, matched, changed, changes }, null, 2));
