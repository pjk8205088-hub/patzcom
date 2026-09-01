import fs from 'node:fs';
import path from 'node:path';
import { saveCatalogSnapshot } from '../lib/catalog-pages.mjs';
import { enrichProductsWithBrowseImages, hasEbayBrowseCredentials } from '../lib/ebay-browse.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const currentCatalogPath = path.join(siteRoot, 'assets', 'products.json');
const outputsDir = path.join(process.cwd(), 'outputs');

const DEFAULT_REPORT = 'C:/Users/user/Downloads/eBay-all-active-listings-report-2026-06-18-13308736874.csv';
const reportFiles = process.argv.slice(2);
const sourceFiles = reportFiles.length ? reportFiles : [DEFAULT_REPORT];
const targetListingSite = String(process.env.EBAY_LISTING_SITE || 'US').trim().toUpperCase();

const CATEGORY_TRANSLATIONS = [
  { pattern: /calipers? & brackets?|bremssättel|pinze e staffe|pinzas y sujeciones|étriers et supports|pinze e staffe/i, value: 'Brake Calipers & Brackets' },
  { pattern: /exhaust system kits?|kits de systèmes d['’]échappement|auspuffanlagen & kits|kit per sistemi di scarico|escape: kits para sistemas de escape/i, value: 'Exhaust System Kits' },
  { pattern: /shocks?, struts? & assemblies?|amortiguadores?, puntales y piezas ensambladas|amortisseurs, jambes de force et assemblages|stoßdämpfer & federbeine|ammortizzatori, montanti e assemblaggi/i, value: 'Shocks, Struts & Assemblies' },
  { pattern: /brake disc rotors?|freins : disques|frenos: discos de freno|freni a disco|bremsscheiben/i, value: 'Brake Disc Rotors' },
  { pattern: /brake pads?|freins : plaquettes|frenos: pastillas de freno|pastiglie dei freni|bremsbeläge/i, value: 'Brake Pads' },
  { pattern: /shock & strut mounts?|stoßdämpfer- & federbeinhalterungen|supports d'amortisseur et de jambe de force|amortiguadores y puntales: soportes|supporti per ammortizzatori e montanti/i, value: 'Shock & Strut Mounts' },
  { pattern: /leaf & coil springs?|molle a balestra e a spirale|resortes de ballesta y helicoidales|ressorts à lames et ressorts hélicoïdaux|blatt- & spiralfedern/i, value: 'Leaf & Coil Springs' },
  { pattern: /body moldings? & trims?|body moul?dings? & trims?|schutz- & zierleisten|molduras y revestimientos de protección|modanature e decorazioni|moulures et garnitures de carrosserie/i, value: 'Body Moldings & Trims' },
  { pattern: /other brake parts|autres pièces|otros|altro freni e ricambi/i, value: 'Other Brake Parts' },
  { pattern: /sway bars?, links? & bushings?|barres stabilisatrices, maillons et bagues|barras estabilizadoras, articulaciones y bujes|stabilisatoren, klammern & buchsen|barre antirollio, collegamenti e boccole/i, value: 'Sway Bars, Links & Bushings' },
  { pattern: /manifolds? & headers?|colectores y distribuidores|collettori di scarico|abgaskrümmer|collecteurs et en-têtes/i, value: 'Manifolds & Headers' },
  { pattern: /exhaust pipes? & tips?|tuyaux d['’]échappement et embouts|tubi e terminali di scarico|escape: tubos de escape y puntas|auspuffrohre & -endrohre/i, value: 'Exhaust Pipes & Tips' },
  { pattern: /lift kits? & parts?|lift kits?|kits de suspensión|kit di sospensione|sport-gewindefahrwerk|coilover|combinés filetés/i, value: 'Lift Coilover Suspension Kit' },
  { pattern: /lower kits? & parts?|lowering springs?|lower kits?|lowering spring/i, value: 'Lowering Springs' },
  { pattern: /running boards? & side bars?|marchepieds et barres latérales|estribos y barras laterales|pedane sottoporta e barre laterali/i, value: 'Running Boards & Side Bars' },
  { pattern: /door handles?|poignées de portières|manillas de puertas|türgriffe|maniglie esterne/i, value: 'Door Handles' },
  { pattern: /body kits?|body trim|trim/i, value: 'Trim' },
];

const PLACEHOLDER_DESC = (title, itemNumber, category, qty) => `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; max-width: 760px; margin: 0 auto;">
    <h2 style="margin-bottom: 12px;">${escapeHtml(title)}</h2>
    <p>This product was imported from an eBay active listings report and remapped into the PATZCOM storefront format.</p>
    <ul>
      <li><strong>Item number:</strong> ${escapeHtml(itemNumber || 'n/a')}</li>
      <li><strong>Category:</strong> ${escapeHtml(category)}</li>
      <li><strong>Available quantity:</strong> ${escapeHtml(String(qty || 0))}</li>
    </ul>
    <p>Images were not included in the Seller Hub active listings CSV export, so this product uses the PATZCOM image fallback until richer image data is provided.</p>
  </div>
`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function normalizeKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function inferCategory(title, rawCategory) {
  const text = `${rawCategory || ''} ${title || ''}`;
  for (const rule of CATEGORY_TRANSLATIONS) {
    if (rule.pattern.test(text)) {
      return rule.value;
    }
  }
  const cleaned = String(rawCategory || 'Other').trim();
  return cleaned || 'Other';
}

function guessVendor(title) {
  const text = String(title || '');
  const bracket = text.match(/\[([^\]]{2,40})\]\s*$/);
  if (bracket) return bracket[1].trim().toUpperCase();

  const known = ['STOLZ BRAKE', 'HARDRON ZR', 'LUXON', 'STORMSPRING', 'BIGFOOT', 'JUN B.L', 'STORM', 'PATZCOM'];
  const upper = text.toUpperCase();
  for (const vendor of known) {
    if (upper.includes(vendor)) return vendor;
  }

  const firstWords = text.split(/\s+/).slice(0, 3).join(' ').trim();
  return firstWords ? firstWords.toUpperCase() : 'PATZCOM';
}

function parseNumber(value) {
  const num = Number(String(value || '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function readCsvReport(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = parseCSV(text);
  const header = rows[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  const idx = Object.fromEntries(header.map((name, index) => [name, index]));
  return rows.slice(1).map((row) => ({
    itemNumber: String(row[idx['Item number']] || '').trim(),
    title: String(row[idx.Title] || '').trim(),
    sku: String(row[idx['Custom label (SKU)']] || '').trim(),
    qty: parseNumber(row[idx['Available quantity']]),
    format: String(row[idx.Format] || '').trim(),
    currency: String(row[idx.Currency] || '').trim(),
    startPrice: parseNumber(row[idx['Start price']]),
    currentPrice: parseNumber(row[idx['Current price']]),
    category: String(row[idx['eBay category 1 name']] || '').trim(),
    condition: String(row[idx.Condition] || '').trim(),
    listingSite: String(row[idx['Listing site']] || '').trim(),
    upc: String(row[idx['P:UPC']] || '').trim(),
    ean: String(row[idx['P:EAN']] || '').trim(),
    isbn: String(row[idx['P:ISBN']] || '').trim(),
  })).filter((row) => row.itemNumber && row.title);
}

function buildExistingImageMap() {
  const map = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(currentCatalogPath, 'utf8'));
    const items = Array.isArray(raw) ? raw : raw.items || [];
    for (const item of items) {
      const titleKey = normalizeKey(item.title);
      if (!map.has(titleKey)) {
        map.set(titleKey, { images: item.images || [], desc_html: item.desc_html || '' });
      }
    }
  } catch {
    // ignore
  }
  return map;
}

async function main() {
  const sources = sourceFiles.length ? sourceFiles : [DEFAULT_REPORT];
  const existingMap = buildExistingImageMap();
  const mergedRows = new Map();
  for (const source of sources) {
    for (const row of readCsvReport(source)) {
      mergedRows.set(row.itemNumber, row);
    }
  }
  const rows = Array.from(mergedRows.values());
  const siteRows = targetListingSite
    ? rows.filter((row) => row.listingSite.toUpperCase() === targetListingSite)
    : rows;
  const skippedRows = rows.length - siteRows.length;

  const products = siteRows.map((row) => {
    const titleKey = normalizeKey(row.title);
    const existing = existingMap.get(titleKey);
    const category = inferCategory(row.title, row.category);
    const itemNumber = row.itemNumber;
    const handle = `${itemNumber}`;
    const descHtml = existing?.desc_html || PLACEHOLDER_DESC(row.title, itemNumber, category, row.qty);
    const images = Array.isArray(existing?.images) ? existing.images : [];

    return {
      id: itemNumber,
      ebayItemId: itemNumber,
      title: row.title,
      handle,
      vendor: guessVendor(row.title),
      type: category,
      tags: [row.category, row.condition, row.listingSite].filter(Boolean),
      price: row.currentPrice || row.startPrice || 0,
      compare: null,
      available: row.qty > 0,
      grams: 0,
      sku: row.sku || '',
      currency: row.currency || '',
      listingSite: row.listingSite || '',
      ebaySource: 'seller-hub-active-listings',
      desc_text: `${row.title} imported from eBay Seller Hub active listings report.`,
      desc_html: descHtml,
      images,
    };
  });

  if (hasEbayBrowseCredentials()) {
    try {
      const enrichment = await enrichProductsWithBrowseImages(products, {
        maxItems: Number(process.env.EBAY_IMAGE_ENRICH_LIMIT || 0) || Infinity,
        force: true,
      });
      console.log(`eBay Browse API image enrichment updated ${enrichment.updated} products.`);
    } catch (error) {
      console.warn(`eBay Browse API image enrichment skipped: ${error.message}`);
    }
  } else {
    console.log('eBay Browse API image enrichment skipped: missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET.');
  }

  const savedProducts = await saveCatalogSnapshot(products);

  fs.mkdirSync(outputsDir, { recursive: true });
  fs.writeFileSync(path.join(outputsDir, 'ebay-active-listings-patzcom.json'), JSON.stringify({
    source: sources,
    generatedAt: new Date().toISOString(),
    count: savedProducts.length,
    items: savedProducts,
  }, null, 2), 'utf8');

  console.log(`Imported ${savedProducts.length} unique ${targetListingSite || 'all'} eBay listings from ${sources.length} source file(s).`);
  if (skippedRows) console.log(`Skipped ${skippedRows} listings outside ${targetListingSite}.`);
}

await main();
