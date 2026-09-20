import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';

const catalogPath = path.resolve('work/abc11-site_1/site/assets/products.json');
const products = JSON.parse(await readFile(catalogPath, 'utf8'));
const byPrimaryImage = new Map();

for (const product of products) {
  const primary = Array.isArray(product.images) ? String(product.images[0] || '').trim() : '';
  if (!primary) continue;
  if (!byPrimaryImage.has(primary)) byPrimaryImage.set(primary, []);
  byPrimaryImage.get(primary).push(product);
}

const sharedImages = new Set(
  [...byPrimaryImage.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([image]) => image),
);

let cleared = 0;
const cleaned = products.map((product) => {
  const primary = Array.isArray(product.images) ? String(product.images[0] || '').trim() : '';
  if (!primary || !sharedImages.has(primary)) return product;
  cleared += 1;
  return { ...product, images: [], imageStatus: 'awaiting-exact-ebay-image' };
});

await saveCatalogSnapshot(cleaned, { deduplicate: false });
console.log(JSON.stringify({
  products: products.length,
  sharedPrimaryImages: sharedImages.size,
  cleared,
  exactOrUniqueImagesRemaining: products.length - cleared,
}, null, 2));
