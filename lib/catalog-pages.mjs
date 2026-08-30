import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsDir = path.join(siteRoot, 'products');
const productsJsonPath = path.join(siteRoot, 'assets', 'products.json');

const CATEGORY_LINKS = {
  'BRAKE PADS': 'brake-pads.html',
  'BIG BRAKE KIT': 'big-brake-kit.html',
  'BIG BRAKE KITS': 'big-brake-kit.html',
  'HEAVY-DUTY DURABILITY': 'heavy-duty-durability.html',
  'LIFT COILOVER SUSPENSION KIT': 'lift-coilover-suspension-kit.html',
  'LOWERING SPRINGS': 'lowering-spring.html',
  'REAR SWAY BAR': 'rear-anti-roll-bar.html',
  'REAR ANTI-ROLL BAR': 'rear-anti-roll-bar.html',
  'STRUT TOWER BARS': 'strut-tower-bar-under-bars.html',
  'STRUT TOWER BAR UNDER BARS': 'strut-tower-bar-under-bars.html',
};

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#f4f6fb"/>
      <rect x="24" y="24" width="752" height="552" rx="24" fill="#ffffff" stroke="#d8e0ea"/>
      <g fill="#9aa6b8" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
        <text x="400" y="288" font-size="28" font-weight="700">Image unavailable</text>
        <text x="400" y="334" font-size="18">This product image could not be loaded.</text>
      </g>
    </svg>
  `);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function money(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? `$${num.toLocaleString('en-US')}` : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function normalizeAssetPath(url) {
  if (!url) return PLACEHOLDER_IMAGE;
  const text = String(url);
  if (/^(https?:|data:|\/\/)/i.test(text)) return text;
  if (text.startsWith('../') || text.startsWith('./')) return text;
  if (text.startsWith('assets/')) return `../${text}`;
  return text;
}

function rewriteDescHtml(html) {
  return String(html || '')
    .replace(/(src|href)=["']assets\//g, '$1="../assets/')
    .replace(/(src|href)=["']\.\/assets\//g, '$1="../assets/')
    .replace(/(src|href)=["']\.\.\/assets\//g, '$1="../assets/');
}

function collectionHref(type) {
  return CATEGORY_LINKS[String(type || '').trim().toUpperCase()] || 'all.html';
}

function buildCategoryLabel(product) {
  const href = collectionHref(product.type);
  const label = product.type || 'All Products';
  return `<a href="../collections/${href}">${escapeHtml(label)}</a>`;
}

function buildRelatedProducts(product, products) {
  const related = products
    .filter((item) => item.handle !== product.handle && String(item.type || '').toLowerCase() === String(product.type || '').toLowerCase())
    .slice(0, 4);

  if (!related.length) return '';

  return `
    <section class="sec">
      <div class="wrap">
        <div class="sec-h"><h2>You may also like</h2></div>
        <div class="grid">
          ${related.map((item) => `
            <a class="card" href="../products/${encodeURIComponent(item.handle)}.html">
              <div class="card-img"><img loading="lazy" src="${normalizeAssetPath(item.images?.[0])}" alt="${escapeAttr(item.title)}"></div>
              <div class="card-b">
                <div class="vendor">${escapeHtml(item.vendor || 'PATZCOM')}</div>
                <h3>${escapeHtml(item.title)}</h3>
                <div class="price">${money(item.price)}${item.compare ? ` <span class="was">${money(item.compare)}</span>` : ''}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function buildProductHero(product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const mainImage = normalizeAssetPath(images[0]);
  const thumbs = (images.length ? images : [PLACEHOLDER_IMAGE]).slice(0, 10);
  const stockText = product.available ? '✔ In stock — ready to ship' : 'Currently unavailable';
  const categoryLabel = product.type || 'All Products';
  const tags = Array.isArray(product.tags) ? product.tags : [];

  return `
    <div class="wrap detail-banner">
      <h1>${escapeHtml(product.title)}</h1>
      <p>${escapeHtml(product.vendor || 'PATZCOM')} · ${escapeHtml(categoryLabel)} · Marketplace-style product details</p>
    </div>
    <div class="wrap crumbs">
      <a href="../index.html">Home</a> / ${buildCategoryLabel(product)} / ${escapeHtml(product.title)}
    </div>
    <section class="pdp wrap">
      <div class="gal">
        <div class="mainimg">
          <img id="mainimg" src="${mainImage}" alt="${escapeAttr(product.title)}">
        </div>
        <div class="thumbs">
          ${thumbs.map((src, index) => `<img class="thumb${index === 0 ? ' on' : ''}" src="${normalizeAssetPath(src)}" alt="" onclick="setMain(this)">`).join('')}
        </div>
      </div>
      <div class="buy">
        <div class="vendor">${escapeHtml(product.vendor || 'PATZCOM')}</div>
        <h1>${escapeHtml(product.title)}</h1>
        <div class="price big">${money(product.price)}${product.compare ? ` <span class="was">${money(product.compare)}</span>` : ''}</div>
        <div class="stock">${escapeHtml(stockText)}</div>
        <div class="qtyrow"><label>Qty</label><input id="qty" type="number" value="1" min="1"></div>
        <button class="btn add" onclick="addToCart('${escapeAttr(product.id)}')">Add to cart</button>
        <a class="btn ghost" href="../cart.html" onclick="addToCart('${escapeAttr(product.id)}')">Buy it now</a>
        <ul class="meta">
          <li>Vendor: ${escapeHtml(product.vendor || 'PATZCOM')}</li>
          <li>Type: ${escapeHtml(categoryLabel)}</li>
          <li>Weight: ${escapeHtml(product.grams ? `${Number(product.grams).toLocaleString('en-US')} g` : '—')}</li>
          <li>SKU: ${escapeHtml(product.sku || product.id || '—')}</li>
        </ul>
        ${tags.length ? `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>
    </section>
  `;
}

function buildDetailSections(product) {
  const descHtml = rewriteDescHtml(product.desc_html || `<p>${escapeHtml(product.desc_text || product.title)}</p>`);
  const fitment = String(product.desc_text || product.title).replace(/\s+/g, ' ').slice(0, 120);

  return `
    <section class="sec">
      <div class="wrap desc">
        ${descHtml}
      </div>
    </section>
    <section class="sec">
      <div class="wrap">
        <div class="qa-panel detail-qa-note">
          <div class="qa-head">
            <p class="eyebrow">Fitment</p>
            <h2>Vehicle compatibility and order notes</h2>
            <p class="muted">Use the Q&amp;A area below to ask fitment questions before checkout.</p>
          </div>
          <div class="fit-card" style="margin-top:16px">
            <div class="fit-icon">VIN</div>
            <div>
              <div class="fit-title">Check if this fits your vehicle</div>
              <div class="fit-sub">${escapeHtml(fitment)}${fitment.length >= 120 ? '…' : ''}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildHeader() {
  return `
    <header class="hdr">
      <div class="wrap">
        <a class="logo" href="../index.html"><em>PATZCOM</em></a>
        <nav class="mainnav">
          <a href="../index.html">Home</a>
          <div class="drop">
            <a href="../collections/all.html">Categories ▾</a>
            <div class="dropmenu">
              <a href="../collections/brake-pads.html">Brake Pads</a>
              <a href="../collections/big-brake-kit.html">Big Brake Kits</a>
              <a href="../collections/heavy-duty-durability.html">Heavy-Duty Durability</a>
              <a href="../collections/lift-coilover-suspension-kit.html">Lift Coilover Suspension Kit</a>
              <a href="../collections/lowering-spring.html">Lowering Springs</a>
              <a href="../collections/rear-anti-roll-bar.html">Rear Sway Bar</a>
              <a href="../collections/strut-tower-bar-under-bars.html">Strut Tower Bars</a>
              <a href="../collections/all.html">All Products</a>
            </div>
          </div>
          <a href="../about.html">About Us</a>
          <a href="../contact.html">Contact Us</a>
        </nav>
        <div class="hdr-r">
          <input id="q" class="search" type="search" placeholder="Search parts...">
          <a class="cartbtn" href="../cart.html">Cart <span id="cartcount">0</span></a>
        </div>
      </div>
      <div id="results" class="results"></div>
    </header>
  `;
}

function buildFooter() {
  return `
    <footer class="ftr">
      <div class="wrap ftr-grid">
        <div>
          <div class="logo">PATZCOM</div>
          <p>Your trusted source for premium automotive parts and performance upgrades.</p>
          <p class="pay">Checkout: PayPal first · Stripe cards planned</p>
        </div>
        <div>
          <h4>Categories</h4>
          <ul>
            <li><a href="../collections/brake-pads.html">Brake Pads</a></li>
            <li><a href="../collections/big-brake-kit.html">Big Brake Kits</a></li>
            <li><a href="../collections/heavy-duty-durability.html">Heavy-Duty Durability</a></li>
            <li><a href="../collections/lift-coilover-suspension-kit.html">Lift Coilover Suspension Kit</a></li>
            <li><a href="../collections/lowering-spring.html">Lowering Springs</a></li>
            <li><a href="../collections/rear-anti-roll-bar.html">Rear Sway Bar</a></li>
            <li><a href="../collections/strut-tower-bar-under-bars.html">Strut Tower Bars</a></li>
          </ul>
        </div>
        <div>
          <h4>Info</h4>
          <ul>
            <li><a href="../about.html">About Us</a></li>
            <li><a href="../contact.html">Contact Us</a></li>
            <li><a href="../policies.html">Privacy Policy</a></li>
            <li><a href="../policies.html#shipping">Shipping &amp; Returns</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact Us</h4>
          <ul>
            <li>support@patzcom.com</li>
            <li>Mon–Fri 09:00–18:00 (ET)</li>
          </ul>
        </div>
      </div>
      <div class="wrap copy">© 2026 patzcom.com. All rights reserved.</div>
    </footer>
  `;
}

export function buildProductPage(product, products = []) {
  const related = buildRelatedProducts(product, products);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(product.title)} | patzcom</title>
<meta name="description" content="${escapeAttr(String(product.desc_text || product.title).slice(0, 160))}">
<link rel="stylesheet" href="../assets/site.css">
<script defer src="../assets/config.js"></script>
<script defer src="../assets/site.js"></script>
<script>window.ROOT="../";</script>
</head>
<body class="detail-white-page" data-product="${escapeAttr(product.handle)}" data-category="${escapeAttr(product.type || '')}">
${buildHeader()}
${buildProductHero(product)}
${buildDetailSections(product)}
${related}
${buildFooter()}
</body>
</html>
`;
}

export async function rewriteProductPages(products) {
  await mkdir(productsDir, { recursive: true });
  await Promise.all(products.map((product) => {
    const filePath = path.join(productsDir, `${product.handle}.html`);
    return writeFile(filePath, buildProductPage(product, products), 'utf8');
  }));
}

function coerceImages(item) {
  const raw = item.images
    ?? item.imageUrls
    ?? item.additionalImageUrls
    ?? item.image
    ?? item.gallery
    ?? item.media?.images
    ?? [];
  if (Array.isArray(raw)) return raw.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (typeof value === 'object') return [
      value.url || value.src || value.imageUrl || value.link || value.image || value.thumbnailUrl || ''
    ].filter(Boolean);
    return [];
  });
  if (typeof raw === 'string') return [raw];
  if (raw && typeof raw === 'object') {
    return [raw.url || raw.src || raw.imageUrl || raw.link || raw.image || raw.thumbnailUrl || ''].filter(Boolean);
  }
  return [];
}

function coerceNumber(value) {
  const raw = value && typeof value === 'object'
    ? (value.value ?? value.amount ?? value.currentValue ?? value.listingPrice ?? value.price ?? value.minPrice ?? value.maxPrice ?? value.convertedValue ?? 0)
    : value;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function coerceTags(item) {
  const raw = item.tags ?? item.tag ?? item.keywords ?? [];
  if (Array.isArray(raw)) return raw.map((value) => String(value).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(/[;,|]/).map((value) => value.trim()).filter(Boolean);
  return [];
}

function uniqueHandle(base, used) {
  let handle = base || 'product';
  let counter = 2;
  while (used.has(handle)) {
    handle = `${base || 'product'}-${counter++}`;
  }
  used.add(handle);
  return handle;
}

function normalizeSingleProduct(item, index, usedHandles) {
  if (!item || typeof item !== 'object') return null;
  const title = String(item.title || item.name || item.itemTitle || `Imported Product ${index + 1}`).trim();
  const handle = uniqueHandle(
    String(item.handle || item.slug || item.urlKey || slugify(title)).trim().replace(/\.html?$/i, ''),
    usedHandles,
  );
  const id = String(item.id || item.itemId || item.sku || handle);
  const images = coerceImages(item).map(normalizeAssetPath);
  return {
    id,
    title,
    handle,
    vendor: String(item.vendor || item.brand || item.seller || item.storeName || 'PATZCOM').trim(),
    type: String(item.type || item.category || item.primaryCategory || 'All Products').trim(),
    tags: coerceTags(item),
    price: coerceNumber(item.price ?? item.currentPrice ?? item.salePrice ?? item.priceValue ?? item.pricing?.currentPrice),
    compare: coerceNumber(item.compare ?? item.compareAt ?? item.listPrice ?? item.pricing?.listPrice ?? 0) || null,
    available: Boolean(item.available ?? item.inStock ?? item.inventoryAvailable ?? true),
    grams: coerceNumber(item.grams ?? item.weight ?? item.shippingWeight ?? 0),
    sku: String(item.sku || item.sellerSku || '').trim(),
    desc_text: String(item.desc_text || item.shortDescription || item.subtitle || title).trim(),
    desc_html: String(item.desc_html || item.descriptionHtml || item.description || '').trim(),
    images,
  };
}

export function normalizeCatalogPayload(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.listings)
          ? payload.listings
          : [];
  const usedHandles = new Set();
  return rawItems
    .map((item, index) => normalizeSingleProduct(item, index, usedHandles))
    .filter(Boolean);
}

export async function saveCatalogSnapshot(products) {
  await mkdir(path.dirname(productsJsonPath), { recursive: true });
  await writeFile(productsJsonPath, JSON.stringify(products, null, 2), 'utf8');
  await rewriteProductPages(products);
  return products;
}
