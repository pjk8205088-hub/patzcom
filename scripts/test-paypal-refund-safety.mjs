import test from 'node:test';
import assert from 'node:assert/strict';
import { refundPayment } from '../lib/payment-api.mjs';

test('PayPal refund uses the supplied idempotency key and validates provider state', async () => {
  const originalFetch = globalThis.fetch;
  const previous = [process.env.PAYPAL_ENV, process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET];
  process.env.PAYPAL_ENV = 'sandbox'; process.env.PAYPAL_CLIENT_ID = 'test'; process.env.PAYPAL_CLIENT_SECRET = 'test';
  let calls = 0;
  globalThis.fetch = async (url, options = {}) => {
    assert.match(url, /^https:\/\/api-m\.sandbox\.paypal\.com\//);
    if (url.endsWith('/token')) return { ok: true, json: async () => ({ access_token: 'test' }) };
    calls++;
    assert.equal(options.headers['PayPal-Request-Id'], 'refund-test-uuid');
    assert.equal(JSON.parse(options.body).amount.value, '25.00');
    return { ok: true, json: async () => ({ id: 'REFUND123', status: 'COMPLETED' }) };
  };
  try {
    const order = { id: 5, provider: 'paypal', capture_id: 'CAPTURE123', total: '100.00', refunded_amount: '0' };
    assert.equal((await refundPayment(order, 25, '', 'refund-test-uuid')).status, 'COMPLETED');
    await assert.rejects(refundPayment(order, 101, '', 'refund-test-uuid'), /Refund must/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    ['PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'].forEach((key, i) => previous[i] === undefined ? delete process.env[key] : process.env[key] = previous[i]);
  }
});
