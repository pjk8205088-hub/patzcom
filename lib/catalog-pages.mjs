import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsDir = path.join(siteRoot, 'products');
const productsJsonPath = path.join(siteRoot, 'assets', 'products.json');

const CATEGORY_ALIASES = [
  { label: 'All Products', slug: 'all', aliases: ['ALL PRODUCTS', 'ALL', 'EVERYTHING'] },
  { label: 'Brake Pads', slug: 'brake-pads', aliases: ['BRAKE PADS', 'BRAKE PAD', 'BRAKING PADS'] },
  { label: 'Big Brake Kits', slug: 'big-brake-kit', aliases: ['BIG BRAKE KIT', 'BIG BRAKE KITS', 'BIG BRAKE'] },
  { label: 'Heavy-Duty Durability', slug: 'heavy-duty-durability', aliases: ['HEAVY-DUTY DURABILITY', 'HEAVY DUTY DURABILITY', 'HEAVY DUTY'] },
  { label: 'Lift Coilover Suspension Kit', slug: 'lift-coilover-suspension-kit', aliases: ['LIFT COILOVER SUSPENSION KIT', 'COILOVER', 'COILOVER KITS', 'LIFT COILOVER'] },
  { label: 'Lowering Springs', slug: 'lowering-spring', aliases: ['LOWERING SPRINGS', 'LOWERING SPRING', 'LOWERING'] },
  { label: 'Rear Sway Bar', slug: 'rear-anti-roll-bar', aliases: ['REAR SWAY BAR', 'REAR ANTI-ROLL BAR', 'REAR ANTI ROLL BAR', 'ANTI-ROLL BAR', 'ANTI ROLL BAR'] },
  { label: 'Strut Tower Bars', slug: 'strut-tower-bar-under-bars', aliases: ['STRUT TOWER BARS', 'STRUT TOWER BAR', 'STRUT TOWER BAR UNDER BARS', 'UNDER BARS'] },
];

const CATEGORY_LOOKUP = new Map();
for (const category of CATEGORY_ALIASES) {
  for (const alias of [category.label, ...category.aliases]) {
    CATEGORY_LOOKUP.set(String(alias).trim().replace(/\s+/g, ' ').toUpperCase(), category);
  }
}

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

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[-_/]+|\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeDedupeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9가-힣]+/g, '');
}

function dedupeKey(product) {
  const sku = normalizeDedupeText(product.sku || product.sellerSku);
  if (sku) return `sku:${sku}`;

  // Seller Hub exports may repeat one listing under different item IDs while
  // leaving SKU blank. The normalized title is the stable product identity.
  return `title:${normalizeDedupeText(product.title)}`;
}

function mergeDuplicateProduct(kept, candidate) {
  const images = [...new Set([
    ...(Array.isArray(kept.images) ? kept.images : []),
    ...(Array.isArray(candidate.images) ? candidate.images : []),
  ].filter(Boolean))];
  const tags = [...new Set([
    ...(Array.isArray(kept.tags) ? kept.tags : []),
    ...(Array.isArray(candidate.tags) ? candidate.tags : []),
  ].filter(Boolean))];
  const richerDescription = String(candidate.desc_html || '').length > String(kept.desc_html || '').length
    ? candidate.desc_html
    : kept.desc_html;
  const richerText = String(candidate.desc_text || '').length > String(kept.desc_text || '').length
    ? candidate.desc_text
    : kept.desc_text;

  return {
    ...kept,
    images,
    tags,
    desc_html: richerDescription || kept.desc_html,
    desc_text: richerText || kept.desc_text,
    sku: kept.sku || candidate.sku || '',
    grams: kept.grams || candidate.grams || 0,
    available: Boolean(kept.available || candidate.available),
  };
}

export function dedupeCatalogProducts(products = []) {
  const byKey = new Map();
  const order = [];

  for (const product of products) {
    const key = dedupeKey(product);
    if (!byKey.has(key)) {
      byKey.set(key, product);
      order.push(key);
      continue;
    }
    byKey.set(key, mergeDuplicateProduct(byKey.get(key), product));
  }

  return order.map((key) => byKey.get(key));
}

function categoryMeta(type) {
  const key = normalizeKey(type);
  if (!key || key === 'ALL PRODUCTS' || key === 'ALL') {
    return { label: 'All Products', slug: 'all' };
  }
  return CATEGORY_LOOKUP.get(key) || {
    label: String(type || 'All Products').trim() || 'All Products',
    slug: slugify(type || 'all-products'),
  };
}

function categoryHref(type) {
  const meta = categoryMeta(type);
  return `${meta.slug}.html`;
}

function uniqueCategories(products = []) {
  const map = new Map();
  for (const product of products) {
    const meta = categoryMeta(product.type);
    if (!map.has(meta.slug)) {
      map.set(meta.slug, { ...meta, count: 0 });
    }
    map.get(meta.slug).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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

function buildCategoryLabel(product) {
  const meta = categoryMeta(product.type);
  const href = categoryHref(product.type);
  const label = meta.label;
  return `<a href="../collections/${href}">${escapeHtml(label)}</a>`;
}

function buildCategoryMenu(categories = []) {
  const items = [{ label: 'All Products', slug: 'all' }, ...categories.filter((category) => category.slug !== 'all')];
  return items.map((category) => `<a href="../collections/${category.slug}.html">${escapeHtml(category.label)}${category.count ? ` <span class="count">(${category.count})</span>` : ''}</a>`).join('');
}

function buildCategoryFooterItems(categories = []) {
  const items = [{ label: 'All Products', slug: 'all' }, ...categories.filter((category) => category.slug !== 'all')];
  return items.map((category) => `<li><a href="../collections/${category.slug}.html">${escapeHtml(category.label)}</a></li>`).join('');
}

function buildRelatedProducts(product, products) {
  const targetCategory = categoryMeta(product.type).slug;
  const related = products
    .filter((item) => item.handle !== product.handle && categoryMeta(item.type).slug === targetCategory)
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

function buildTrustBadges() {
  return `
    <div class="trust-row" aria-label="Purchase benefits">
      <span>PayPal first</span>
      <span>Stripe cards ready</span>
      <span>FedEx shipping</span>
      <span>30-day returns</span>
    </div>
  `;
}

function buildFitmentCard(product) {
  const fitment = String(product.desc_text || product.title).replace(/\s+/g, ' ').slice(0, 140);
  return `
    <div class="fit-card fit-card--hero">
      <div class="fit-icon">VIN</div>
      <div>
        <div class="fit-title">Check compatibility before checkout</div>
        <div class="fit-sub">${escapeHtml(fitment)}${fitment.length >= 140 ? '…' : ''}</div>
      </div>
    </div>
    <div class="fit-grid">
      <input type="text" placeholder="Year">
      <input type="text" placeholder="Make">
      <input type="text" placeholder="Model">
      <input type="text" placeholder="Trim">
      <input type="text" placeholder="Engine">
      <button type="button" class="fit-btn">Add vehicle</button>
    </div>
  `;
}

function buildPaymentPanel() {
  return `
    <div class="pay-panel">
      <div class="pay-title">Payment options</div>
      <div class="pay-row"><span>PayPal</span><strong>Primary checkout</strong></div>
      <div class="pay-row"><span>Stripe</span><strong>Card checkout ready</strong></div>
      <div class="pay-row"><span>Buyer protection</span><strong>Secure checkout</strong></div>
    </div>
  `;
}

function buildPolicyPanel() {
  return `
    <div class="policy-box">
      <div class="policy-title">Shipping, returns and buyer notes</div>
      <div class="policy-copy">
        Free FedEx International Priority shipping, clear return guidance, and support for fitment questions before you place an order.
      </div>
    </div>
  `;
}

function buildProductSummaryPanels(product) {
  const categoryLabel = categoryMeta(product.type).label;
  return `
    <div class="market-summary-grid">
      <article class="market-summary-card">
        <p class="eyebrow">Marketplace view</p>
        <h3>${escapeHtml(product.title)}</h3>
        <p class="muted">White product detail layout with a left media column, right buy box, and support panels below.</p>
      </article>
      <article class="market-summary-card">
        <p class="eyebrow">Vehicle fitment</p>
        <h3>Built for ${escapeHtml(categoryLabel)}</h3>
        <p class="muted">Use the compatibility box to confirm year, make, model, trim and engine before checkout.</p>
      </article>
      <article class="market-summary-card">
        <p class="eyebrow">Checkout stack</p>
        <h3>PayPal first, Stripe ready</h3>
        <p class="muted">Keep the public checkout flow simple while seller tools and API sync evolve behind the scenes.</p>
      </article>
    </div>
  `;
}

function buildProductHero(product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const mainImage = normalizeAssetPath(images[0]);
  const thumbs = (images.length ? images : [PLACEHOLDER_IMAGE]).slice(0, 10);
  const stockText = product.available ? '✔ In stock — ready to ship' : 'Currently unavailable';
  const categoryLabel = categoryMeta(product.type).label;
  const tags = Array.isArray(product.tags) ? product.tags : [];

  return `
    <div class="wrap detail-banner">
      <h1>${escapeHtml(product.title)}</h1>
      <p>${escapeHtml(product.vendor || 'PATZCOM')} · ${escapeHtml(categoryLabel)} · PATZCOM marketplace detail page</p>
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
        <div class="store-line">
          <div class="store-mark">P</div>
          <div>
            <strong>PATZCOM</strong> <span>(1220)</span>
            <div class="store-note">100% positive · ${escapeHtml(product.vendor || 'PATZCOM')} parts · message seller</div>
          </div>
        </div>
        <div class="price big">${money(product.price)}${product.compare ? ` <span class="was">${money(product.compare)}</span>` : ''}</div>
        <div class="tax-note">Taxes may apply. Final total is shown at checkout.</div>
        <div class="stock">${escapeHtml(stockText)}</div>
        <div class="shipline">Shipping shown separately · Domestic delivery prioritized · Buyer location may affect options</div>
        ${buildFitmentCard(product)}
        <div class="qtyrow"><label>Qty</label><input id="qty" type="number" value="1" min="1"></div>
        <button class="btn add" onclick="addToCart('${escapeAttr(product.id)}')">Buy it now</button>
        <a class="btn ghost" href="../cart.html" onclick="addToCart('${escapeAttr(product.id)}')">Add to cart</a>
        ${buildTrustBadges()}
        ${buildPaymentPanel()}
        ${buildPolicyPanel()}
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
  return `
    <section class="sec">
      <div class="wrap desc">
        ${descHtml}
      </div>
    </section>
    <section class="sec">
      <div class="wrap">
        ${buildProductSummaryPanels(product)}
      </div>
    </section>
    <div class="wrap qa-mount" data-mode="product" data-product="${escapeAttr(product.handle)}" data-category="${escapeAttr(product.type || '')}"></div>
  `;
}

function buildHeader(categories = []) {
  return `
    <header class="hdr">
      <div class="wrap">
        <a class="logo" href="../index.html"><em>PATZCOM</em></a>
        <nav class="mainnav">
          <a href="../index.html">Home</a>
          <div class="drop">
            <a href="../collections/all.html">Categories ▾</a>
            <div class="dropmenu">
              ${buildCategoryMenu(categories)}
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

function buildFooter(categories = []) {
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
            ${buildCategoryFooterItems(categories)}
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
  const categories = uniqueCategories(products);
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
${buildHeader(categories)}
${buildProductHero(product)}
${buildDetailSections(product)}
${related}
${buildFooter(categories)}
</body>
</html>
`;
}

export async function rewriteProductPages(products) {
  await mkdir(productsDir, { recursive: true });
  for (const product of products) {
    const filePath = path.join(productsDir, `${product.handle}.html`);
    await writeFile(filePath, buildProductPage(product, products), 'utf8');
  }
}

function buildCollectionCard(product) {
  const meta = categoryMeta(product.type);
  return `
    <a class="card" href="../products/${encodeURIComponent(product.handle)}.html">
      <div class="card-img">
        ${product.compare ? '<span class="badge">SALE</span>' : ''}
        <img loading="lazy" src="${normalizeAssetPath(product.images?.[0])}" alt="${escapeAttr(product.title)}">
      </div>
      <div class="card-b">
        <div class="vendor">${escapeHtml(product.vendor || 'PATZCOM')}</div>
        <h3>${escapeHtml(product.title)}</h3>
        <div class="price">${money(product.price)}${product.compare ? ` <span class="was">${money(product.compare)}</span>` : ''}</div>
        <div class="collection-meta">${escapeHtml(meta.label)}</div>
      </div>
    </a>
  `;
}

function buildCollectionPage({ label, slug, products, allProducts }) {
  const categories = uniqueCategories(allProducts);
  const bodyClass = 'collection-white-body';
  const totalCount = products.length;
  const heroCopy = slug === 'all'
    ? 'Browse the complete PATZCOM catalog with a white marketplace layout, strong product cards, and compatibility-first details.'
    : `Browse all PATZCOM listings in ${label}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(label)} | patzcom</title>
<meta name="description" content="${escapeAttr(heroCopy)}">
<link rel="stylesheet" href="../assets/site.css">
<script defer src="../assets/config.js"></script>
<script defer src="../assets/site.js"></script>
<script>window.ROOT="../";</script>
</head>
<body class="${bodyClass}" data-collection="${escapeAttr(slug)}">
${buildHeader(categories)}
<section class="sec">
  <div class="wrap crumbs">
    <a href="../index.html">Home</a> / <a href="../collections/all.html">All Products</a> / ${escapeHtml(label)}
  </div>
</section>
<section class="sec">
  <div class="wrap">
    <div class="sec-h">
      <h2>${escapeHtml(label)}</h2>
      <span class="count">${totalCount.toLocaleString('en-US')} products</span>
    </div>
    <div class="collection-hero-box">
      <p class="collection-hero-kicker">PATZCOM marketplace collection</p>
      <h1>${escapeHtml(label)}</h1>
      <p>${escapeHtml(heroCopy)}</p>
    </div>
    <div class="grid">
      ${products.map((product) => buildCollectionCard(product)).join('')}
    </div>
  </div>
</section>
<div class="wrap qa-mount" data-mode="category" data-category="${escapeAttr(products[0]?.type || '')}"></div>
${buildFooter(categories)}
</body>
</html>
`;
}

async function rewriteCollectionPages(products) {
  const categories = uniqueCategories(products);
  const pages = [
    {
      label: 'All Products',
      slug: 'all',
      products,
    },
    ...categories.filter((category) => category.slug !== 'all').map((category) => ({
      label: category.label,
      slug: category.slug,
      products: products.filter((product) => categoryMeta(product.type).slug === category.slug),
    })),
  ];

  await Promise.all(pages.map((page) => {
    const filePath = path.join(siteRoot, 'collections', `${page.slug}.html`);
    return writeFile(filePath, buildCollectionPage({ ...page, allProducts: products }), 'utf8');
  }));
}

function coerceImages(item) {
  const raw = item.images
    ?? item.imageUrls
    ?? item.additionalImageUrls
    ?? item.image
    ?? item.image?.imageUrl
    ?? item.gallery
    ?? item.media?.images
    ?? item.thumbnailImages
    ?? item.pictureURLLarge
    ?? item.pictureURLMedium
    ?? item.pictureURL
    ?? item.galleryUrl
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
    ? (value.value ?? value.amount ?? value.currentValue ?? value.listingPrice ?? value.price ?? value.minPrice ?? value.maxPrice ?? value.convertedValue ?? value._value ?? 0)
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
  const typeSource = item.type
    || item.category
    || item.primaryCategory?.categoryName
    || item.primaryCategory?.categoryPath
    || item.categoryName
    || item.storeCategory
    || item.productType
    || 'All Products';
  return {
    id,
    title,
    handle,
    vendor: String(item.vendor || item.brand || item.seller || item.storeName || 'PATZCOM').trim(),
    type: String(typeSource).trim(),
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
      : Array.isArray(payload?.itemSummaries)
        ? payload.itemSummaries
      : Array.isArray(payload?.products)
        ? payload.products
      : Array.isArray(payload?.listings)
        ? payload.listings
          : Array.isArray(payload?.ItemArray?.Item)
            ? payload.ItemArray.Item
            : Array.isArray(payload?.searchResult?.item)
              ? payload.searchResult.item
              : Array.isArray(payload?.searchResult?.items)
                ? payload.searchResult.items
                : Array.isArray(payload?.items?.item)
                  ? payload.items.item
          : [];
  const usedHandles = new Set();
  const dedupe = new Set();
  const products = rawItems
    .map((item, index) => normalizeSingleProduct(item, index, usedHandles))
    .filter(Boolean)
    .filter((item) => {
      const fingerprint = normalizeKey(item.id || item.handle || `${item.title}|${item.vendor}|${item.type}`);
      if (dedupe.has(fingerprint)) return false;
      dedupe.add(fingerprint);
      return true;
    });
  return dedupeCatalogProducts(products);
}

async function removeStaleHtmlFiles(directory, keepNames) {
  const names = await readdir(directory, { withFileTypes: true });
  await Promise.all(names
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && !keepNames.has(entry.name))
    .map((entry) => unlink(path.join(directory, entry.name))));
}

export async function saveCatalogSnapshot(products) {
  const dedupedProducts = dedupeCatalogProducts(products);
  await mkdir(path.dirname(productsJsonPath), { recursive: true });
  await writeFile(productsJsonPath, JSON.stringify(dedupedProducts, null, 2), 'utf8');
  await rewriteProductPages(dedupedProducts);
  await removeStaleHtmlFiles(productsDir, new Set(dedupedProducts.map((product) => `${product.handle}.html`)));
  await rewriteCollectionPages(dedupedProducts);
  return dedupedProducts;
}
