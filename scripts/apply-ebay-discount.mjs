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
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = '';
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
let matched = 0;
const next = products.map(product => {
  const id = String(product.ebayItemId || product.id || '');
  const row = ebay.get(id);
  if (!row || row[column('Listing site')] !== 'US' || row[column('Currency')] !== 'USD') return product;
  const ebayPrice = Number(row[column('Current price')]);
  if (!Number.isFinite(ebayPrice) || ebayPrice <= 0) throw new Error(`Invalid eBay price for ${id}.`);
  matched += 1;
  return { ...product, price: Number((ebayPrice * 0.95).toFixed(2)), compare: ebayPrice, currency: 'USD', listingSite: 'US' };
});

if (matched !== products.length) throw new Error(`Refusing partial discount: matched ${matched} of ${products.length} products.`);
await saveCatalogSnapshot(next, { deduplicate: false });
console.log(JSON.stringify({ catalogProducts: products.length, matched, discountPercent: 5, examples: next.slice(0, 5).map(({ id, price, compare }) => ({ id, price, compare })) }, null, 2));
