import { readFile } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsPath = path.join(siteRoot, 'assets', 'products.json');

let cachedProducts = null;

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

async function loadProducts() {
  if (cachedProducts) return cachedProducts;
  const raw = await readFile(productsPath, 'utf8');
  cachedProducts = JSON.parse(raw);
  return cachedProducts;
}

export async function getProductsSummary(limit = 12) {
  const items = await loadProducts();
  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    handle: item.handle,
    vendor: item.vendor,
    category: item.type,
    price: toMoney(item.price),
    compareAt: item.compare ? toMoney(item.compare) : null,
    available: Boolean(item.available),
    image: item.images?.[0] || null,
  }));
}

export async function getCatalogInsights() {
  const items = await loadProducts();
  const vendors = new Set(items.map((item) => item.vendor).filter(Boolean));
  const categories = new Set(items.map((item) => item.type).filter(Boolean));
  const inStock = items.filter((item) => item.available).length;

  return {
    productCount: items.length,
    vendorCount: vendors.size,
    categoryCount: categories.size,
    inStockCount: inStock,
  };
}

export function getIntegrationStatus() {
  return {
    ebay: {
      ready: Boolean(
        process.env.EBAY_CLIENT_ID &&
          process.env.EBAY_CLIENT_SECRET &&
          process.env.EBAY_REDIRECT_URI
      ),
      scopesConfigured: Boolean(process.env.EBAY_SCOPES),
      authCodePresent: Boolean(process.env.EBAY_AUTH_CODE),
      refreshTokenPresent: Boolean(process.env.EBAY_REFRESH_TOKEN),
    },
    paypal: {
      ready: Boolean(process.env.PAYPAL_CLIENT_ID),
      environment: process.env.PAYPAL_ENV || 'live',
    },
  };
}

export async function getAdminSnapshot() {
  const insights = await getCatalogInsights();
  const integrations = getIntegrationStatus();

  return {
    generatedAt: new Date().toISOString(),
    storefront: {
      domain: 'www.patzcom.com',
      salesChannel: 'direct-to-customer',
      checkoutPriority: ['paypal', 'stripe'],
    },
    catalog: insights,
    operations: {
      inventorySync: integrations.ebay.ready ? 'ready-for-token-exchange' : 'awaiting-ebay-keys',
      orderDesk: 'ui-ready',
      shippingDesk: 'ui-ready',
      payoutReporting: integrations.ebay.ready ? 'scaffolded' : 'pending-ebay-auth',
    },
    integrations,
  };
}

export async function lookupOrder(query) {
  const clean = String(query || '').trim();
  return {
    found: false,
    query: clean,
    message: clean
      ? 'Customer order lookup UI is ready. Connect eBay Fulfillment or your own order database to return live order status here.'
      : 'Enter an order number or buyer email to use the future order lookup endpoint.',
  };
}
