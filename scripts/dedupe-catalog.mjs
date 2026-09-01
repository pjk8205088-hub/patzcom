import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { dedupeCatalogProducts, saveCatalogSnapshot } from '../lib/catalog-pages.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsPath = path.join(siteRoot, 'assets', 'products.json');
const raw = JSON.parse(await readFile(productsPath, 'utf8'));
const products = Array.isArray(raw) ? raw : raw.items || raw.products || [];
const deduped = dedupeCatalogProducts(products);

if (!products.length) {
  throw new Error('No products found in assets/products.json.');
}

await saveCatalogSnapshot(deduped);
console.log(`Removed ${products.length - deduped.length} duplicate products.`);
console.log(`Kept ${deduped.length} unique products.`);
