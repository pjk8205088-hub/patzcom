import fs from 'node:fs';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';
import { enrichProductsWithBrowseImages, hasEbayBrowseCredentials } from '../lib/ebay-browse.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsJsonPath = path.join(siteRoot, 'assets', 'products.json');

async function main() {
  if (!fs.existsSync(productsJsonPath)) {
    throw new Error(`Missing catalog snapshot at ${productsJsonPath}`);
  }

  if (!hasEbayBrowseCredentials()) {
    throw new Error('Set EBAY_ACCESS_TOKEN or EBAY_CLIENT_ID and EBAY_CLIENT_SECRET before running image enrichment.');
  }

  const raw = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  const products = Array.isArray(raw) ? raw : raw.items || [];
  if (!Array.isArray(products) || !products.length) {
    throw new Error('No products found in assets/products.json.');
  }

  const result = await enrichProductsWithBrowseImages(products, {
    maxItems: Number(process.env.EBAY_IMAGE_ENRICH_LIMIT || 0) || Infinity,
    exactOnly: process.env.EBAY_IMAGE_EXACT_ONLY !== 'false',
  });

  await saveCatalogSnapshot(products);
  console.log(JSON.stringify({
    processed: result.processed,
    updated: result.updated,
    directMatches: result.directMatches,
    searchMatches: result.searchMatches,
    preserved: result.preserved,
  }, null, 2));
}

await main();
