import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const tokenPath = path.join(dataDir, 'ebay-oauth.json');

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

export function getEbayConfig() {
  return {
    clientId: process.env.EBAY_CLIENT_ID || '',
    clientSecret: process.env.EBAY_CLIENT_SECRET || '',
    redirectUri: process.env.EBAY_REDIRECT_URI || '',
    scopes: String(process.env.EBAY_SCOPES || '')
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean),
    environment: getEbayEnvironment(),
    ...getBaseUrls(),
  };
}

export async function readStoredEbayTokens() {
  try {
    const raw = await readFile(tokenPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeStoredEbayTokens(payload) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(tokenPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function requireConfig(config) {
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error('Missing eBay OAuth credentials. Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_REDIRECT_URI.');
  }
  if (!config.scopes.length) {
    throw new Error('Missing EBAY_SCOPES. Add the required eBay OAuth scopes before connecting.');
  }
}

export function buildEbayConsentUrl(state) {
  const config = getEbayConfig();
  requireConfig(config);
  const url = new URL('/oauth2/authorize', config.authBaseUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'login');
  return url.toString();
}

function buildBasicAuthHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function postTokenForm(params) {
  const config = getEbayConfig();
  requireConfig(config);
  const response = await fetch(`${config.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(config.clientId, config.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Unable to mint eBay OAuth token.');
  }

  return payload;
}

export async function exchangeAuthorizationCode(code) {
  const config = getEbayConfig();
  const tokenPayload = await postTokenForm({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  const stored = {
    environment: config.environment,
    updatedAt: new Date().toISOString(),
    scope: tokenPayload.scope || config.scopes.join(' '),
    accessToken: tokenPayload.access_token,
    accessTokenExpiresIn: tokenPayload.expires_in,
    accessTokenExpiresAt: new Date(Date.now() + Number(tokenPayload.expires_in || 0) * 1000).toISOString(),
    refreshToken: tokenPayload.refresh_token || null,
    refreshTokenExpiresIn: tokenPayload.refresh_token_expires_in || null,
    refreshTokenExpiresAt: tokenPayload.refresh_token_expires_in
      ? new Date(Date.now() + Number(tokenPayload.refresh_token_expires_in) * 1000).toISOString()
      : null,
      tokenType: tokenPayload.token_type || 'User Access Token',
  };

  await writeStoredEbayTokens(stored);
  return stored;
}

export async function refreshUserAccessToken() {
  const config = getEbayConfig();
  const stored = await readStoredEbayTokens();
  const refreshToken = stored?.refreshToken || process.env.EBAY_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('No eBay refresh token is available. Complete the consent flow first.');
  }

  const tokenPayload = await postTokenForm({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: config.scopes.join(' '),
  });

  const refreshed = {
    ...(stored || {}),
    environment: config.environment,
    updatedAt: new Date().toISOString(),
    scope: tokenPayload.scope || config.scopes.join(' '),
    accessToken: tokenPayload.access_token,
    accessTokenExpiresIn: tokenPayload.expires_in,
    accessTokenExpiresAt: new Date(Date.now() + Number(tokenPayload.expires_in || 0) * 1000).toISOString(),
    refreshToken,
    refreshTokenExpiresIn: stored?.refreshTokenExpiresIn || null,
    refreshTokenExpiresAt: stored?.refreshTokenExpiresAt || null,
    tokenType: tokenPayload.token_type || 'User Access Token',
  };

  await writeStoredEbayTokens(refreshed);
  return refreshed;
}
