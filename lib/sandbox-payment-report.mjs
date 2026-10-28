// Imported Sandbox evidence is stored separately from operational orders.
export const sandboxReportNamespace = 'admin-sandbox-payment-reports';
export const sandboxReportKey = 'paypal-latest';

export function normalizeSandboxPaymentReport(input, actor) {
  if (input?.environment !== 'sandbox' || input.realMoneyTransferred !== false) throw new Error('A PayPal Sandbox report is required.');
  const rows = input.transactions;
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('Report must contain between 1 and 100 transactions.');
  const verified = input.independentPayPalVerification;
  if (verified?.refundsCompleted !== rows.length || verified?.capturesRefunded !== rows.length || !Number.isFinite(Date.parse(verified?.verifiedAt))) throw new Error('PayPal verification evidence is missing.');
  const seen = { orderId: new Set(), captureId: new Set(), refundId: new Set(), reference: new Set() };
  const transactions = rows.map((row, index) => {
    if (row.captured !== true || row.paymentStatus !== 'COMPLETED' || row.refundStatus !== 'COMPLETED' || row.adminPaidStatus !== 'paid' || row.adminRefundStatus !== 'refunded') throw new Error('Only completed Sandbox payment and refund results can be imported.');
    const normalized = { number: index + 1 };
    for (const field of Object.keys(seen)) {
      const value = String(row[field] || '');
      if (!/^[A-Za-z0-9-]{6,100}$/.test(value) || seen[field].has(value)) throw new Error(`Invalid or duplicate ${field}.`);
      seen[field].add(value); normalized[field] = value;
    }
    const total = Number(row.total);
    if (!Number.isFinite(total) || total <= 0 || total > 1000000 || Math.abs(total * 100 - Math.round(total * 100)) > 0.00001) throw new Error('Invalid Sandbox transaction amount.');
    return { ...normalized, currency: 'USD', total, paymentStatus: 'COMPLETED', refundStatus: 'COMPLETED', adminPaidStatus: 'paid', adminRefundStatus: 'refunded' };
  });
  const total = Math.round(transactions.reduce((sum, row) => sum + row.total, 0) * 100) / 100;
  return { environment: 'sandbox', source: 'Imported PayPal Sandbox API verification report', realMoneyTransferred: false,
    date: String(input.date || '').slice(0, 10), verifiedAt: new Date(verified.verifiedAt).toISOString(),
    importedAt: new Date().toISOString(), importedBy: actor,
    payments: transactions.length, refunds: transactions.length, totalPaidUSD: total, totalRefundedUSD: total,
    transactions };
}
