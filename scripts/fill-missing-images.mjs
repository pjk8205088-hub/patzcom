import fs from 'node:fs';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsJsonPath = path.join(siteRoot, 'assets', 'products.json');

async function main() {
  if (!fs.existsSync(productsJsonPath)) {
    throw new Error(`Missing catalog snapshot at ${productsJsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  const products = Array.isArray(raw) ? raw : raw.items || [];
  if (!Array.isArray(products) || !products.length) {
    throw new Error('No products found in assets/products.json.');
  }

  const missing = products.filter((product) => !Array.isArray(product.images) || !product.images.filter(Boolean).length);
  await saveCatalogSnapshot(products);
  console.log(`Products missing exact images: ${missing.length}.`);
  console.log('No images were copied between different item numbers. Use the eBay Browse API enrichment command for exact listing images.');
}

await main();
