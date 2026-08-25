import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getEbayConfig, readStoredEbayTokens } from './ebay-oauth.mjs';

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

export async function getIntegrationStatus() {
  const ebayConfig = getEbayConfig();
  const storedTokens = await readStoredEbayTokens();
  const ebayKeysReady = Boolean(
    ebayConfig.clientId &&
      ebayConfig.clientSecret &&
      ebayConfig.redirectUri
  );
  const ebayScopesConfigured = Boolean(process.env.EBAY_SCOPES);
  const ebayAuthCodePresent = Boolean(process.env.EBAY_AUTH_CODE);
  const ebayRefreshTokenPresent = Boolean(process.env.EBAY_REFRESH_TOKEN || storedTokens?.refreshToken);
  const paypalReady = Boolean(process.env.PAYPAL_CLIENT_ID);

  return {
    ebay: {
      ready: ebayKeysReady,
      environment: ebayConfig.environment,
      scopesConfigured: ebayScopesConfigured,
      authCodePresent: ebayAuthCodePresent,
      refreshTokenPresent: ebayRefreshTokenPresent,
      callbackConfigured: Boolean(ebayConfig.redirectUri),
      consentUrlReady: ebayKeysReady && ebayScopesConfigured,
      tokenStorePresent: Boolean(storedTokens),
      storedTokenUpdatedAt: storedTokens?.updatedAt || null,
      accessTokenExpiresAt: storedTokens?.accessTokenExpiresAt || null,
      oauthStatus: ebayRefreshTokenPresent
        ? 'refresh-token-ready'
        : ebayAuthCodePresent
          ? 'auth-code-captured'
          : ebayKeysReady
            ? 'awaiting-user-consent'
            : 'client-credentials-missing',
      apiReadiness: {
        account: ebayKeysReady && ebayScopesConfigured ? 'ready-to-configure-policies' : 'needs-credentials-and-scopes',
        inventory: ebayKeysReady ? 'ready-for-sku-and-offer-sync' : 'needs-oauth-setup',
        fulfillment: ebayRefreshTokenPresent ? 'ready-for-order-and-shipping-sync' : 'awaiting-refresh-token',
        analytics: ebayRefreshTokenPresent ? 'ready-for-reporting-calls' : 'reporting-locked-until-auth',
      },
    },
    paypal: {
      ready: paypalReady,
      environment: process.env.PAYPAL_ENV || 'live',
      onboardingStatus: paypalReady ? 'client-ready' : 'awaiting-live-client-id',
    },
  };
}

export async function getAdminSnapshot() {
  const insights = await getCatalogInsights();
  const integrations = await getIntegrationStatus();

  return {
    generatedAt: new Date().toISOString(),
    storefront: {
      domain: 'www.patzcom.com',
      salesChannel: 'direct-to-customer',
      checkoutPriority: ['paypal', 'stripe'],
    },
    catalog: insights,
    operations: {
      inventorySync: integrations.ebay.apiReadiness.inventory,
      policyCenter: integrations.ebay.apiReadiness.account,
      orderDesk: integrations.ebay.apiReadiness.fulfillment,
      shippingDesk: integrations.ebay.apiReadiness.fulfillment,
      payoutReporting: integrations.ebay.apiReadiness.analytics,
    },
    integrations,
    ebayApiPlan: [
      {
        name: 'Account API',
        purpose: 'business policies, fulfillment policy, return policy, payment settings',
        status: integrations.ebay.apiReadiness.account,
      },
      {
        name: 'Inventory API',
        purpose: 'SKU, quantity, offer publishing, compatibility data',
        status: integrations.ebay.apiReadiness.inventory,
      },
      {
        name: 'Fulfillment API',
        purpose: 'orders, shipping fulfillment, tracking updates, refunds',
        status: integrations.ebay.apiReadiness.fulfillment,
      },
      {
        name: 'Finances and reporting',
        purpose: 'payout visibility, settlement review, sales reporting readiness',
        status: integrations.ebay.apiReadiness.analytics,
      },
      {
        name: 'OAuth callback',
        purpose: 'authorization redirect, token exchange, refresh token storage',
        status: integrations.ebay.refreshTokenPresent ? 'callback-and-token-store-ready' : integrations.ebay.consentUrlReady ? 'ready-for-user-consent' : 'callback-configuration-required',
      },
    ],
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
