import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { normalizeSandboxPaymentReport, sandboxReportNamespace, sandboxReportKey } from '../lib/sandbox-payment-report.mjs';

// Real PostgreSQL SQL engine in memory; PayPal HTTP is replaced with fixtures.
// No production database or payment account is used by this suite.
test('PayPal refund persistence and recovery', async (t) => {
  const db = new PGlite();
  const locks = new Set();
  const previous = { Pool: pg.Pool, Client: pg.Client, url: process.env.DATABASE_URL, environment: process.env.PAYPAL_ENV };
  pg.Pool = class { async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); } };
  pg.Client = class {
    async connect() {}
    async end() {}
    async query(sql, values) {
      const key = values[0];
      if (sql.includes('pg_try_advisory_lock')) { const locked = !locks.has(key); if (locked) locks.add(key); return { rows: [{ locked }] }; }
      locks.delete(key); return { rows: [{}] };
    }
  };
  process.env.DATABASE_URL = 'postgres://test'; process.env.PAYPAL_ENV = 'sandbox';
  const store = await import('../lib/postgres.mjs');
  const { createPayPalRefundService } = await import('../lib/paypal-refunds.mjs');
  let sequence = 0;
  async function seed(total = 100) {
    sequence++;
    return store.recordOrder({ reference: `TEST-${sequence}`, provider: 'paypal', providerOrderId: `ORDER${sequence}`, status: 'paid', cart: { subtotal: total, shipping: 0, total, lines: [{ id: 'A', quantity: 1, unitAmount: total }] } });
  }
  const settlement = async () => ({ captureId: 'CAPTURE123' });
  try {
    await t.test('10 paid order fixtures and 10 refunds persist once each', async () => {
      let calls = 0;
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement, refundPayment: async (_order, amount) => ({ id: `REFUND-${++calls}`, status: 'COMPLETED', amount, debit: amount }) });
      for (let i = 0; i < 10; i++) {
        const order = await seed();
        const result = await processRefund(order.id, { amount: 100 }, 'admin@test');
        assert.equal(result.order.status, 'refunded');
        assert.equal(Number(result.order.refunded_amount), 100);
        assert.equal(result.order.refunds.length, 1);
        await assert.rejects(processRefund(order.id, { amount: 100 }, 'admin@test'), /eligible/);
      }
      assert.equal(calls, 10);
      const summary = await db.query("SELECT COUNT(*)::int AS count, SUM(refunded_amount)::text AS total FROM patzcom_orders WHERE status='refunded'");
      assert.equal(summary.rows[0].count, 10); assert.equal(Number(summary.rows[0].total), 1000);
    });
    await t.test('pending result is checked by refund ID and counted only after completion', async () => {
      const order = await seed(); let calls = 0;
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement,
        refundPayment: async (_o, amount) => { calls++; return { id: 'PENDING123', status: 'PENDING', amount, debit: amount }; },
        retrievePayPalRefund: async () => ({ id: 'PENDING123', status: 'COMPLETED', amount: 100, debit: 100 }) });
      const pending = await processRefund(order.id, { amount: 100 }, 'admin@test');
      assert.equal(pending.order.status, 'refund_pending'); assert.equal(Number(pending.order.refunded_amount), 0);
      await assert.rejects(processRefund(order.id, { amount: 1 }, 'admin@test'), /pending/);
      const result = await processRefund(order.id, {}, 'admin@test', true);
      assert.equal(result.order.status, 'refunded'); assert.equal(calls, 1);
      await processRefund(order.id, {}, 'admin@test', true);
      assert.equal((await store.getOrderById(order.id)).refunds.length, 1);
    });
    await t.test('lost response recovers the original request ID and amount', async () => {
      const order = await seed(); const keys = [];
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement,
        refundPayment: async (_o, amount, _reason, key) => { keys.push(key); if (keys.length === 1) throw new Error('connection lost'); return { id: 'RECOVER123', status: 'COMPLETED', amount, debit: amount }; } });
      await assert.rejects(processRefund(order.id, { amount: 25 }, 'admin@test'), /connection lost/);
      const result = await processRefund(order.id, { amount: 80 }, 'admin@test', true);
      assert.equal(keys[0], keys[1]); assert.equal(Number(result.order.refunded_amount), 25);
      assert.equal(result.order.status, 'partially_refunded');
      await store.updateOrderStatus({ providerOrderId: order.provider_order_id, status: 'paid' });
      assert.equal((await store.getOrderById(order.id)).status, 'partially_refunded');
    });
    await t.test('concurrent requests are rejected while a refund is active', async () => {
      const order = await seed(); let release; let entered;
      const ready = new Promise(resolve => { entered = resolve; });
      const wait = new Promise(resolve => { release = resolve; });
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement, refundPayment: async (_o, amount) => { entered(); await wait; return { id: 'CONCURRENT', status: 'COMPLETED', amount, debit: amount }; } });
      const first = processRefund(order.id, { amount: 50 }, 'admin@test'); await ready;
      await assert.rejects(processRefund(order.id, { amount: 50 }, 'admin@test'), /already being processed/);
      release(); await first;
      assert.equal((await store.getOrderById(order.id)).refunds.length, 1);
    });
    await t.test('failed provider refund restores refundable balance', async () => {
      const order = await seed();
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement, refundPayment: async (_o, amount) => ({ id: 'FAILED123', status: 'FAILED', amount, debit: amount }) });
      const result = await processRefund(order.id, { amount: 10 }, 'admin@test');
      assert.equal(result.order.status, 'paid'); assert.equal(Number(result.order.refunded_amount), 0); assert.equal(result.order.refund_in_progress, false);
    });
    await t.test('expired unknown request is held for review without another payment call', async () => {
      const order = await seed(); let calls = 0;
      await store.savePayPalRefundAttempt(order.id, { requestId: 'old-request', amount: 100, environment: 'sandbox', startedAt: Date.now() - 6 * 60 * 60 * 1000 });
      const processRefund = createPayPalRefundService({ refundPayment: async () => { calls++; } });
      await assert.rejects(processRefund(order.id, {}, 'admin@test', true), /retry window has expired/);
      assert.equal(calls, 0); assert.equal((await store.getOrderById(order.id)).status, 'refund_pending');
    });
    await t.test('two partial refunds cannot exceed the paid total', async () => {
      const order = await seed(); let calls = 0;
      const processRefund = createPayPalRefundService({ fetchSettlement: settlement, refundPayment: async (_o, amount) => ({ id: `PARTIAL${++calls}`, status: 'COMPLETED', amount, debit: amount }) });
      await processRefund(order.id, { amount: 60 }, 'admin@test');
      await assert.rejects(processRefund(order.id, { amount: 50 }, 'admin@test'), /exceeds/);
      const result = await processRefund(order.id, { amount: 40 }, 'admin@test');
      assert.equal(Number(result.order.refunded_amount), 100); assert.equal(result.order.status, 'refunded'); assert.equal(calls, 2);
    });
    await t.test('Sandbox result import is persisted separately from operational orders', async () => {
      const before = await store.listOrders();
      const row = { captured: true, orderId: 'ORDER12345', reference: 'PATZCOM-TEST123', captureId: 'CAPTURE123', refundId: 'REFUND123', total: 57, paymentStatus: 'COMPLETED', refundStatus: 'COMPLETED', adminPaidStatus: 'paid', adminRefundStatus: 'refunded' };
      const input = { environment: 'sandbox', realMoneyTransferred: false, transactions: [row], independentPayPalVerification: { refundsCompleted: 1, capturesRefunded: 1, verifiedAt: '2026-10-28T10:22:29Z' } };
      const report = normalizeSandboxPaymentReport(input, 'admin@test');
      await store.writeState(sandboxReportNamespace, sandboxReportKey, report);
      const saved = await store.readState(sandboxReportNamespace, sandboxReportKey);
      assert.equal(saved.payments, 1); assert.equal(saved.refunds, 1); assert.equal(saved.totalPaidUSD, 57);
      assert.deepEqual(await store.listOrders(), before);
      assert.throws(() => normalizeSandboxPaymentReport({ ...input, environment: 'live' }, 'admin@test'), /Sandbox report/);
      assert.throws(() => normalizeSandboxPaymentReport({ ...input, independentPayPalVerification: null }, 'admin@test'), /evidence/);
      assert.throws(() => normalizeSandboxPaymentReport({ ...input, transactions: [row, row], independentPayPalVerification: { ...input.independentPayPalVerification, refundsCompleted: 2, capturesRefunded: 2 } }, 'admin@test'), /duplicate/);
    });
  } finally {
    pg.Pool = previous.Pool; pg.Client = previous.Client;
    previous.url === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = previous.url;
    previous.environment === undefined ? delete process.env.PAYPAL_ENV : process.env.PAYPAL_ENV = previous.environment;
    await db.close();
  }
});
