import crypto from 'node:crypto';
import { buildVerifiedCart } from './payment-api.mjs';
import { initializeDatabase, readState, recordOrder, writeState } from './postgres.mjs';

const SDK_URLS = {
  production: 'https://ui.payverseglobal.com/js/payments.js',
  sandbox: 'https://ui-snd.payverseglobal.com/js/payments.js',
};

function environment() {
  return process.env.PAYVERSE_ENV === 'sandbox' ? 'sandbox' : 'production';
}

function configured() {
  return Boolean(process.env.PAYVERSE_MID && process.env.PAYVERSE_CLIENT_KEY && process.env.PAYVERSE_SECRET_KEY);
}

function now() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sha512(value) {
  return crypto.createHash('sha512').update(value, 'utf8').digest('hex');
}

function publicBaseUrl() {
  return String(process.env.PATZCOM_PUBLIC_URL || 'https://www.patzcom.com').replace(/\/$/, '');
}

function amountText(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function getPayverseConfig() {
  const env = environment();
  return {
    enabled: configured(),
    environment: env,
    mid: process.env.PAYVERSE_MID || '',
    clientKey: process.env.PAYVERSE_CLIENT_KEY || '',
    sdk: SDK_URLS[env],
    currency: 'USD',
  };
}

export async function createPayverseRequest(items) {
  if (!configured()) throw new Error('Payverse is not configured. Add PAYVERSE_MID, PAYVERSE_CLIENT_KEY, and PAYVERSE_SECRET_KEY in Railway.');
  if (!(await initializeDatabase())) throw new Error('PostgreSQL is required for checkout.');
  const cart = await buildVerifiedCart(items);
  const amount = amountText(cart.total);
  const reqDate = now();
  const orderId = `${cart.reference}-PV`;
  const sign = sha512(`||${process.env.PAYVERSE_SECRET_KEY}||${process.env.PAYVERSE_MID}||${orderId}||${amount}||${reqDate}||`);
  await writeState('payverse', orderId, { cart, amount, reqDate, mid: process.env.PAYVERSE_MID }, Date.now() + 30 * 60 * 1000);
  return {
    ...cart,
    orderId,
    reqDate,
    requestAmount: amount,
    requestCurrency: 'USD',
    mid: process.env.PAYVERSE_MID,
    clientKey: process.env.PAYVERSE_CLIENT_KEY,
    sdk: SDK_URLS[environment()],
    sign,
    returnUrl: `${publicBaseUrl()}/api/payverse/return`,
    webhookUrl: `${publicBaseUrl()}/api/payverse/webhook`,
    productName: cart.lines.length > 1 ? `${cart.lines[0].title} and ${cart.lines.length - 1} more` : cart.lines[0].title,
  };
}

export async function recordPayverseResult(result) {
  const payload = result || {};
  const orderId = String(payload.orderId || '').trim();
  const status = String(payload.resultStatus || '').toUpperCase();
  const tid = String(payload.tid || '').trim();
  if (!orderId || !['SUCCESS', 'PROCESSING', 'PENDING', 'DECLINE', 'FAILED'].includes(status)) throw new Error('Invalid Payverse payment result.');
  const pending = await readState('payverse', orderId);
  if (!pending) throw new Error('Payverse payment request could not be found or has expired.');
  if (status !== 'SUCCESS') return { ...payload, orderId, status: status.toLowerCase(), cart: pending.cart };
  const order = await recordOrder({ reference: pending.cart.reference, provider: 'payverse', providerOrderId: tid || orderId, status: 'paid', cart: pending.cart });
  return { ...payload, orderId, status: 'paid', order, cart: pending.cart };
}
