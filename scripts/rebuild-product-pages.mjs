import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rewriteProductPages, normalizeCatalogPayload } from '../lib/catalog-pages.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsPath = path.join(siteRoot, 'assets', 'products.json');

const raw = await readFile(productsPath, 'utf8');
const products = normalizeCatalogPayload(JSON.parse(raw));

await rewriteProductPages(products);
console.log(`Rebuilt ${products.length} product pages.`);
