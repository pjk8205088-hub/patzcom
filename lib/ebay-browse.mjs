const DEFAULT_APP_SCOPES = 'https://api.ebay.com/oauth/api_scope';

let cachedApplicationToken = null;

function getEbayEnvironment() {
  return (process.env.EBAY_ENV || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
}

function getBaseUrls() {
  const env = getEbayEnvironment();
  return env === 'sandbox'
    ? {
        authBaseUrl: 'https://auth.sandbox.ebay.com',
        apiBaseUrl: 'https://api.sandbox.ebay.com',
      }
    : {
        authBaseUrl: 'https://auth.ebay.com',
        apiBaseUrl: 'https://api.ebay.com',
      };
}

export function getEbayBrowseConfig() {
  const clientId = process.env.EBAY_CLIENT_ID || '';
  const clientSecret = process.env.EBAY_CLIENT_SECRET || '';
  const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
  const scopes = String(process.env.EBAY_APP_SCOPES || DEFAULT_APP_SCOPES)
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    clientId,
    clientSecret,
    marketplaceId,
    scopes,
    environment: getEbayEnvironment(),
    ...getBaseUrls(),
  };
}

export function hasEbayBrowseCredentials() {
  const config = getEbayBrowseConfig();
  return Boolean(config.clientId && config.clientSecret);
}

function buildBasicAuthHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Unable to parse ${label} JSON payload: ${error.message}`);
  }
}

export async function getApplicationAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedApplicationToken && cachedApplicationToken.expiresAt > Date.now() + 60_000) {
    return cachedApplicationToken.accessToken;
  }

  const config = getEbayBrowseConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing eBay App ID / Cert ID. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to use Browse API image enrichment.');
  }
  if (!config.scopes.length) {
    throw new Error('Missing EBAY_APP_SCOPES. Add the Browse API application scopes before requesting an app token.');
  }

  const response = await fetch(`${config.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(config.clientId, config.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: config.scopes.join(' '),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Unable to mint eBay application token.');
  }

  cachedApplicationToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 0) * 1000,
  };
  return cachedApplicationToken.accessToken;
}

export function isBrowseApiUrl(url) {
  try {
    const parsed = url instanceof URL ? url : new URL(String(url));
    return (
      parsed.hostname === 'api.ebay.com' ||
      parsed.hostname === 'api.sandbox.ebay.com'
    ) && parsed.pathname.startsWith('/buy/browse/v1/');
  } catch {
    return false;
  }
}

export async function fetchBrowseApi(sourceUrl, { method = 'GET', body = null } = {}) {
  const url = sourceUrl instanceof URL ? sourceUrl : new URL(String(sourceUrl));
  const config = getEbayBrowseConfig();
  const accessToken = await getApplicationAccessToken();

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': body ? 'application/json' : 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': config.marketplaceId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const detail = await readJsonResponse(response, url.hostname).catch(() => null);
    throw new Error(detail?.message || detail?.error_description || detail?.error || `eBay Browse API request failed with ${response.status} ${response.statusText}`);
  }

  return readJsonResponse(response, url.hostname);
}

function normalizeQuery(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenScore(query, candidate) {
  const queryWords = normalizeQuery(query).split(' ').filter((word) => word.length >= 3);
  const candidateText = normalizeQuery(candidate);
  let score = 0;
  for (const word of queryWords) {
    if (candidateText.includes(word)) score += 1;
  }
  return score;
}

export function extractBrowseImages(item) {
  const images = [];
  if (item?.image?.imageUrl) images.push(item.image.imageUrl);
  const additionalImages = Array.isArray(item?.additionalImages) ? item.additionalImages : [];
  for (const image of additionalImages) {
    if (image?.imageUrl) images.push(image.imageUrl);
  }
  return [...new Set(images.filter(Boolean))];
}

function normalizeLegacyItemId(value) {
  const text = String(value || '').trim();
  return /^\d{9,14}$/.test(text) ? text : '';
}

export async function getBrowseItemByLegacyId(itemId) {
  const legacyItemId = normalizeLegacyItemId(itemId);
  if (!legacyItemId) return null;

  const config = getEbayBrowseConfig();
  const source = new URL('/buy/browse/v1/item/get_item_by_legacy_id', config.apiBaseUrl);
  source.searchParams.set('legacy_item_id', legacyItemId);

  try {
    return await fetchBrowseApi(source);
  } catch (error) {
    // Ended or hidden listings should not prevent the remaining catalog from syncing.
    if (/\b(404|not found|not_available|invalid item)\b/i.test(String(error.message))) return null;
    throw error;
  }
}

export async function searchBrowseImages(query, { limit = 10 } = {}) {
  const config = getEbayBrowseConfig();
  const source = new URL('/buy/browse/v1/item_summary/search', config.apiBaseUrl);
  source.searchParams.set('q', String(query || '').trim());
  source.searchParams.set('limit', String(Math.max(1, Math.min(Number(limit) || 10, 20))));

  const payload = await fetchBrowseApi(source);
  const items = Array.isArray(payload?.itemSummaries) ? payload.itemSummaries : [];
  return items
    .map((item) => ({
      item,
      images: extractBrowseImages(item),
      score: tokenScore(query, item?.title || ''),
    }))
    .filter((entry) => entry.images.length)
    .sort((a, b) => b.score - a.score || b.images.length - a.images.length);
}

export async function enrichProductsWithBrowseImages(
  products,
  { maxItems = Infinity, force = false } = {},
) {
  if (!hasEbayBrowseCredentials()) {
    throw new Error('eBay Browse API image enrichment requires EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.');
  }

  const results = [];
  const queryCache = new Map();
  let processed = 0;
  let directMatches = 0;
  let searchMatches = 0;
  let preserved = 0;

  for (const product of products) {
    if (processed >= maxItems) break;
    const existingImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    processed += 1;

    const itemId = product.ebayItemId || product.itemId || product.id;
    const directItem = await getBrowseItemByLegacyId(itemId);
    const directImages = extractBrowseImages(directItem);
    if (directImages.length) {
      product.images = directImages.slice(0, 12);
      product.ebayItemId = normalizeLegacyItemId(itemId) || product.ebayItemId || '';
      directMatches += 1;
      results.push({
        id: product.id,
        ebayItemId: product.ebayItemId,
        handle: product.handle,
        title: product.title,
        images: product.images,
        matchedTitle: directItem?.title || '',
        source: 'legacy-item-id',
      });
      continue;
    }

    // Keep trusted PATZCOM media when an old listing is no longer available.
    if (existingImages.length) {
      preserved += 1;
      continue;
    }

    const query = normalizeQuery(product.title || product.desc_text || product.handle).slice(0, 140);
    if (!query) continue;

    let candidates = queryCache.get(query);
    if (!candidates) {
      candidates = await searchBrowseImages(query, { limit: 10 });
      queryCache.set(query, candidates);
    }

    const best = candidates[0];
    if (!best?.images?.length) continue;

    product.images = best.images.slice(0, 8);
    searchMatches += 1;
    results.push({
      id: product.id,
      handle: product.handle,
      title: product.title,
      images: product.images,
      matchedTitle: best.item?.title || '',
      source: 'title-search',
    });
  }

  return {
    processed,
    updated: results.length,
    directMatches,
    searchMatches,
    preserved,
    results,
  };
}
