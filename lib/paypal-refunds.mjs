import crypto from 'node:crypto';
import { getOrderById, withPayPalRefundLock, savePayPalRefundAttempt, finishPayPalRefundAttempt } from './postgres.mjs';
import { refundPayment, retrievePayPalRefund, fetchSettlement } from './payment-api.mjs';

// Dependencies can be replaced in tests. Requests are committed before calling
// PayPal so crashes and lost responses can reuse the original request ID.
export function createPayPalRefundService(dependencies = {}) {
  const d = { getOrderById, withPayPalRefundLock, savePayPalRefundAttempt, finishPayPalRefundAttempt,
    refundPayment, retrievePayPalRefund, fetchSettlement, ...dependencies };
  return async function processRefund(id, input, actor, reconcile = false) {
    return d.withPayPalRefundLock(id, async () => {
      let order = await d.getOrderById(id);
      if (!order || order.provider !== 'paypal') throw new Error('PayPal order not found.');
      let attempt = order.paypal_refund_request;
      if (!attempt) {
        if (reconcile) return { order, refund: null };
        if (!['paid', 'partially_refunded'].includes(order.status) || order.refund_in_progress) throw new Error('Order is not eligible for a refund.');
        const amount = Math.round(Number(input.amount) * 100) / 100;
        const remaining = Math.round((Number(order.total) - Number(order.refunded_amount || 0)) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) throw new Error('Refund exceeds the remaining paid amount.');
        const settlement = await d.fetchSettlement(order);
        if (!settlement.captureId) throw new Error('No PayPal capture found.');
        attempt = { requestId: crypto.randomUUID(), captureId: settlement.captureId, amount,
          reason: String(input.reason || 'Refund from PATZCOM').slice(0, 255), by: actor,
          environment: process.env.PAYPAL_ENV || 'live', startedAt: Date.now() };
        await d.savePayPalRefundAttempt(id, attempt);
      } else if (!reconcile) {
        throw new Error('A refund is pending. Use Check refund to verify its status.');
      }
      if (attempt.environment !== (process.env.PAYPAL_ENV || 'live')) throw new Error('Refund belongs to a different PayPal environment.');
      let refund;
      if (attempt.refundId) {
        refund = await d.retrievePayPalRefund(attempt.refundId);
      } else {
        // Use a conservative five-hour replay window. Leave older unknown
        // outcomes for merchant reconciliation rather than refund again.
        if (Date.now() - attempt.startedAt > 5 * 60 * 60 * 1000) throw new Error('Review this refund in PayPal before taking further action; its retry window has expired.');
        refund = await d.refundPayment({ ...order, capture_id: attempt.captureId }, attempt.amount, attempt.reason, attempt.requestId);
        attempt = { ...attempt, refundId: refund.id };
        await d.savePayPalRefundAttempt(id, attempt);
      }
      if (Math.round(Number(refund.amount) * 100) !== Math.round(attempt.amount * 100)) throw new Error('PayPal refund amount mismatch.');
      if (refund.status === 'PENDING') {
        order = await d.getOrderById(id);
        return { order, refund };
      }
      if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(refund.status)) throw new Error('Unknown PayPal refund state.');
      order = await d.finishPayPalRefundAttempt(id, attempt, refund);
      return { order, refund };
    });
  };
}

export const processPayPalRefund = createPayPalRefundService();
