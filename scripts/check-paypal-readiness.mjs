const environment = process.env.PAYPAL_ENV || 'live';
const base = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials missing.');
const response = await fetch(`${base}/v1/oauth2/token`, {
  method: 'POST', signal: AbortSignal.timeout(20000),
  headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials',
});
const result = await response.json();
console.log(JSON.stringify({ environment, authenticated: response.ok && Boolean(result.access_token),
  refundScope: String(result.scope || '').includes('payments/refund'),
  databaseConfigured: Boolean(process.env.DATABASE_URL) }));
if (!response.ok || !result.access_token) process.exitCode = 1;
