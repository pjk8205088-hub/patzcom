import fs from 'node:fs';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsJsonPath = path.join(siteRoot, 'assets', 'products.json');

function normalizeText(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function overlapScore(source, target) {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = tokenize(target);
  let score = 0;
  for (const token of targetTokens) {
    if (sourceTokens.has(token)) score += 1;
  }
  return score;
}

function buildImageCandidates(products) {
  const candidates = [];
  for (const product of products) {
    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (!images.length) continue;
    candidates.push({
      product,
      images,
      titleText: [product.title, product.desc_text, product.vendor, product.type].filter(Boolean).join(' '),
    });
  }
  return candidates;
}

function pickBestCandidate(product, candidates) {
  let best = null;
  let bestScore = 0;
  const productText = [product.title, product.desc_text, product.vendor, product.type].filter(Boolean).join(' ');

  for (const candidate of candidates) {
    if (candidate.product.id === product.id) continue;

    let score = 0;
    if (normalizeText(candidate.product.vendor) === normalizeText(product.vendor)) score += 6;
    if (normalizeText(candidate.product.type) === normalizeText(product.type)) score += 5;
    score += overlapScore(candidate.titleText, productText);

    const candidateTitle = normalizeText(candidate.product.title);
    const productTitle = normalizeText(product.title);
    if (candidateTitle.includes(productTitle) || productTitle.includes(candidateTitle)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0 ? best : null;
}

async function main() {
  if (!fs.existsSync(productsJsonPath)) {
    throw new Error(`Missing catalog snapshot at ${productsJsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  const products = Array.isArray(raw) ? raw : raw.items || [];
  if (!Array.isArray(products) || !products.length) {
    throw new Error('No products found in assets/products.json.');
  }

  const candidates = buildImageCandidates(products);
  let updated = 0;
  let stillMissing = 0;

  for (const product of products) {
    const existingImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (existingImages.length) continue;

    const best = pickBestCandidate(product, candidates);
    if (!best) {
      stillMissing += 1;
      continue;
    }

    product.images = [...new Set(best.images)].slice(0, 8);
    updated += 1;
  }

  await saveCatalogSnapshot(products);

  console.log(`Auto-filled ${updated} products with category/keyword-matched images.`);
  console.log(`Products still missing images: ${stillMissing}.`);
}

await main();
