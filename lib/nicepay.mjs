import crypto from 'node:crypto';
import { buildVerifiedCart } from './payment-api.mjs';
import { initializeDatabase, readState, recordOrder, writeState } from './postgres.mjs';

const NICEPAY_SCRIPT = 'https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js';

function configured() {
  return Boolean(process.env.NICEPAY_MID && process.env.NICEPAY_MERCHANT_KEY && Number(process.env.NICEPAY_KRW_RATE) > 0);
}

function now() {
  const d = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function publicBaseUrl() {
  return String(process.env.PATZCOM_PUBLIC_URL || 'https://www.patzcom.com').replace(/\/$/, '');
}

export function getNicePayConfig() {
  return { enabled: configured(), mid: process.env.NICEPAY_MID || '', script: NICEPAY_SCRIPT, currency: 'KRW', rateConfigured: Number(process.env.NICEPAY_KRW_RATE) > 0 };
}

export async function createNicePayRequest(items) {
  if (!configured()) throw new Error('나이스페이가 아직 설정되지 않았습니다. NICEPAY_MID와 NICEPAY_MERCHANT_KEY를 등록해 주세요.');
  if (!(await initializeDatabase())) throw new Error('결제를 위해 PostgreSQL 연결이 필요합니다.');
  const cart = await buildVerifiedCart(items);
  const amount = Math.round(cart.total * Number(process.env.NICEPAY_KRW_RATE));
  if (!Number.isInteger(amount) || amount < 1) throw new Error('나이스페이 결제 금액은 1원 이상이어야 합니다.');
  const ediDate = now();
  const moid = `${cart.reference}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`.slice(0, 64);
  const mid = process.env.NICEPAY_MID;
  await writeState('nicepay', moid, { cart, amount, mid }, Date.now() + 30 * 60 * 1000);
  return {
    ...cart,
    amount,
    mid,
    moid,
    ediDate,
    signData: sha256(`${ediDate}${mid}${amount}${process.env.NICEPAY_MERCHANT_KEY}`),
    returnUrl: `${publicBaseUrl()}/api/nicepay/return`,
    goodsName: cart.lines.length > 1 ? `${cart.lines[0].title} 외 ${cart.lines.length - 1}건` : cart.lines[0].title,
  };
}

export async function approveNicePay(form) {
  if (!configured()) throw new Error('나이스페이가 설정되지 않았습니다.');
  const mid = String(form.MID || '');
  const moid = String(form.Moid || '');
  const authToken = String(form.AuthToken || '');
  const tid = String(form.TxTid || '');
  const amount = String(form.Amt || '');
  if (form.AuthResultCode !== '0000' || !mid || !moid || !authToken || !tid || !amount) throw new Error(String(form.AuthResultMsg || '나이스페이 인증에 실패했습니다.'));
  if (mid !== process.env.NICEPAY_MID) throw new Error('나이스페이 MID가 일치하지 않습니다.');
  const pending = await readState('nicepay', moid);
  if (!pending || pending.mid !== mid || String(pending.amount) !== String(Number(amount))) throw new Error('결제 금액 검증에 실패했습니다.');
  const signature = sha256(`${authToken}${mid}${amount}${process.env.NICEPAY_MERCHANT_KEY}`);
  if (form.Signature && form.Signature !== signature) throw new Error('나이스페이 인증 서명이 올바르지 않습니다.');
  const ediDate = now();
  const signData = sha256(`${authToken}${mid}${amount}${ediDate}${process.env.NICEPAY_MERCHANT_KEY}`);
  const endpoint = String(form.NextAppURL || '');
  if (!/^https:\/\/dc[12]-api\.nicepay\.co\.kr\/webapi\/pay_process\.jsp$/.test(endpoint)) throw new Error('나이스페이 승인 URL이 올바르지 않습니다.');
  const body = new URLSearchParams({ TID: tid, AuthToken: authToken, MID: mid, Amt: amount, EdiDate: ediDate, SignData: signData, CharSet: 'utf-8', EdiType: 'JSON' });
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }, body, signal: AbortSignal.timeout(20000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !['3001', '4000', '4100', 'A000'].includes(String(result.ResultCode))) throw new Error(result.ResultMsg || '나이스페이 승인이 완료되지 않았습니다.');
  const order = await recordOrder({ reference: pending.cart.reference, provider: 'nicepay', providerOrderId: tid, status: 'paid', cart: pending.cart });
  return { ...result, orderId: tid, order, cart: pending.cart };
}
