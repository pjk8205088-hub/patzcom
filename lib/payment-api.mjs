import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getCatalogSnapshot, readState, writeState, recordOrder, initializeDatabase } from './postgres.mjs';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsPath = path.join(siteRoot, 'assets', 'products.json');

function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function configuredPayPal() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function configuredStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function cleanQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error('Quantity must be a whole number between 1 and 99.');
  }
  return quantity;
}

function cleanCartItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    throw new Error('Your cart is empty or contains too many different products.');
  }
  return items.map((item) => ({
    id: String(item?.id || '').trim(),
    quantity: cleanQuantity(item?.quantity),
  })).filter((item) => item.id);
}

async function loadProducts() {
  return await getCatalogSnapshot() ?? JSON.parse(await readFile(productsPath, 'utf8'));
}

export async function buildVerifiedCart(items) {
  const requested = cleanCartItems(items);
  const products = await loadProducts();
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const lines = requested.map(({ id, quantity }) => {
    const product = byId.get(id);
    if (!product) throw new Error('One or more cart products are no longer available.');
    if (product.available === false) throw new Error(`${product.title} is currently out of stock.`);
    if (Number.isInteger(product.quantity) && quantity > product.quantity) throw new Error(`${product.title} has only ${product.quantity} units available.`);
    const unitAmount = Number(product.price);
    if (!Number.isFinite(unitAmount) || unitAmount < 0) throw new Error(`Invalid price for ${product.title}.`);
    return {
      id,
      quantity,
      title: String(product.title || 'PATZCOM product').slice(0, 127),
      sku: String(product.sku || id).slice(0, 127),
      unitAmount: Number(unitAmount.toFixed(2)),
      image: product.images?.[0] || null,
    };
  });
  const subtotal = Number(lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0).toFixed(2));
  const shipping = Number(process.env.PATZCOM_SHIPPING_FLAT || 0);
  if (!Number.isFinite(shipping) || shipping < 0) throw new Error('Invalid shipping configuration.');
  return {
    reference: `PATZCOM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
    lines,
    subtotal,
    shipping: Number(shipping.toFixed(2)),
    total: Number((subtotal + shipping).toFixed(2)),
  };
}

export async function paypalAccessToken() {
  if (!configuredPayPal()) throw new Error('PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Railway.');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    signal: AbortSignal.timeout(20000),
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || 'Unable to authenticate with PayPal.');
  return payload.access_token;
}

export async function createPayPalOrder(cartItems) {
  if (!(await initializeDatabase())) throw new Error('Checkout is unavailable until PostgreSQL is connected.');
  const cart = await buildVerifiedCart(cartItems);
  const accessToken = await paypalAccessToken();
  const itemTotal = Number(cart.subtotal.toFixed(2));
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        shipping_preference: 'GET_FROM_FILE',
        user_action: 'PAY_NOW',
      },
      purchase_units: [{
        custom_id: cart.reference,
        description: 'PATZCOM automotive parts',
        amount: {
          currency_code: 'USD',
          value: cart.total.toFixed(2),
          breakdown: {
            item_total: { currency_code: 'USD', value: itemTotal.toFixed(2) },
            shipping: { currency_code: 'USD', value: cart.shipping.toFixed(2) },
          },
        },
        items: cart.lines.map((line) => ({
          name: line.title,
          sku: line.sku,
          quantity: String(line.quantity),
          category: 'PHYSICAL_GOODS',
          unit_amount: { currency_code: 'USD', value: line.unitAmount.toFixed(2) },
        })),
      }],
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.id) throw new Error(payload.message || 'Unable to create the PayPal order.');
  await recordOrder({ reference: cart.reference, provider: 'paypal', providerOrderId: payload.id, status: 'created', cart });
  await writeState('paypal', payload.id, { total: cart.total, reference: cart.reference }, Date.now() + 30 * 60 * 1000);
  return { id: payload.id, reference: cart.reference, subtotal: cart.subtotal, shipping: cart.shipping, total: cart.total, lines: cart.lines };
}

export async function capturePayPalOrder(orderId) {
  const id = String(orderId || '').trim();
  if (!/^[A-Z0-9-]{8,80}$/i.test(id)) throw new Error('Invalid PayPal order ID.');
  const pending = await readState('paypal', id);
  if (!pending) {
    throw new Error('This PayPal checkout session has expired. Please start checkout again.');
  }
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'PayPal-Request-Id': `capture-${id}`,
    },
    body: '{}',
  });
  const payload = await response.json();
  if (!response.ok || !['COMPLETED', 'PENDING'].includes(payload.status)) {
    throw new Error(payload.message || 'Unable to capture the PayPal payment.');
  }
  if (payload.status === 'COMPLETED') {
    const captures = payload.purchase_units?.flatMap(unit => unit.payments?.captures || []) || [];
    const total = captures.reduce((sum, capture) => sum + Number(capture.amount?.value || 0), 0);
    if (!captures.length || captures.some(capture => capture.status !== 'COMPLETED' || capture.amount?.currency_code !== 'USD') || Math.abs(total - pending.total) > 0.005) throw new Error('Payment amount or currency verification failed.');
  }
  const unit = payload.purchase_units?.[0] || {};
  const ship = unit.shipping || {};
  const a = ship.address || {};
  const buyer = {
    email: payload.payer?.email_address || '',
    name: ship.name?.full_name || [payload.payer?.name?.given_name, payload.payer?.name?.surname].filter(Boolean).join(' '),
    phone: payload.payer?.phone?.phone_number?.national_number || '',
    address: a.address_line_1 ? { name: ship.name?.full_name || '', line1: a.address_line_1, line2: a.address_line_2 || '', city: a.admin_area_2 || '', state: a.admin_area_1 || '', postal_code: a.postal_code || '', country: a.country_code || '' } : null,
  };
  return { id: payload.id, status: payload.status, reference: unit.custom_id || null, buyer };
}

function publicBaseUrl() {
  const value = process.env.PATZCOM_PUBLIC_URL || 'https://www.patzcom.com';
  return value.replace(/\/$/, '');
}

function stripeFormValue(value) {
  return encodeURIComponent(String(value));
}

export async function createStripeCheckoutSession(cartItems) {
  if (!(await initializeDatabase())) throw new Error('Checkout is unavailable until PostgreSQL is connected.');
  if (!configuredStripe()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Railway.');
  const cart = await buildVerifiedCart(cartItems);
  const fields = [
    ['mode', 'payment'],
    ['success_url', `${publicBaseUrl()}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`],
    ['cancel_url', `${publicBaseUrl()}/cart.html?payment=cancelled`],
    ['client_reference_id', cart.reference],
    ['billing_address_collection', 'auto'],
    ['phone_number_collection[enabled]', 'true'],
    ...String(process.env.STRIPE_SHIP_COUNTRIES || 'US,CA,KR,AU,GB,JP,DE,FR,NZ,SG').split(',').map((c, i) => [`shipping_address_collection[allowed_countries][${i}]`, c.trim().toUpperCase()]),
  ];
  cart.lines.forEach((line, index) => {
    const prefix = `line_items[${index}]`;
    fields.push(
      [`${prefix}[quantity]`, line.quantity],
      [`${prefix}[price_data][currency]`, 'usd'],
      [`${prefix}[price_data][unit_amount]`, Math.round(line.unitAmount * 100)],
      [`${prefix}[price_data][product_data][name]`, line.title],
      [`${prefix}[price_data][product_data][metadata][product_id]`, line.id],
    );
  });
  if (cart.shipping > 0) {
    const index = cart.lines.length;
    fields.push(
      [`line_items[${index}][quantity]`, 1],
      [`line_items[${index}][price_data][currency]`, 'usd'],
      [`line_items[${index}][price_data][unit_amount]`, Math.round(cart.shipping * 100)],
      [`line_items[${index}][price_data][product_data][name]`, 'Shipping'],
    );
  }
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: fields.map(([key, value]) => `${stripeFormValue(key)}=${stripeFormValue(value)}`).join('&'),
  });
  const payload = await response.json();
  if (!response.ok || !payload.url) throw new Error(payload.error?.message || 'Unable to create the Stripe checkout session.');
  return { id: payload.id, url: payload.url, reference: cart.reference, subtotal: cart.subtotal, shipping: cart.shipping, total: cart.total, lines: cart.lines };
}

export async function retrieveBuyerDetails(order) {
  if (!order?.provider_order_id) throw new Error('This order has no payment provider ID.');
  if (order.provider === 'paypal') {
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(order.provider_order_id)}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to retrieve PayPal buyer details.');
    const unit = payload.purchase_units?.[0] || {};
    const ship = unit.shipping || {};
    const a = ship.address || {};
    const payer = payload.payer || {};
    return {
      email: payer.email_address || '',
      name: ship.name?.full_name || [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(' '),
      phone: payer.phone?.phone_number?.national_number || '',
      address: a.address_line_1 ? { name: ship.name?.full_name || '', line1: a.address_line_1, line2: a.address_line_2 || '', city: a.admin_area_2 || '', state: a.admin_area_1 || '', postal_code: a.postal_code || '', country: a.country_code || '' } : null,
    };
  }
  if (order.provider === 'stripe') return (await retrieveStripeCheckoutSession(order.provider_order_id)).buyer;
  throw new Error('Unknown payment provider.');
}

export async function retrieveStripeCheckoutSession(sessionId) {
  if (!configuredStripe()) throw new Error('Stripe is not configured.');
  const id = String(sessionId || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new Error('Invalid Stripe checkout session ID.');
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Unable to verify the Stripe checkout session.');
  const cd = payload.customer_details || {};
  const sd = payload.collected_information?.shipping_details || payload.shipping_details || null;
  const src = sd?.address || cd.address || null;
  const buyer = {
    email: cd.email || payload.customer_email || '',
    name: sd?.name || cd.name || '',
    phone: cd.phone || '',
    address: src?.line1 ? { name: sd?.name || cd.name || '', line1: src.line1, line2: src.line2 || '', city: src.city || '', state: src.state || '', postal_code: src.postal_code || '', country: src.country || '' } : null,
  };
  return { id: payload.id, status: payload.payment_status, reference: payload.client_reference_id || null, buyer };
}

const money = (v) => (v === undefined || v === null || v === '' ? null : Math.round(Number(v) * 100) / 100);

// Real fee / net figures from the payment provider.
export async function fetchSettlement(order) {
  if (order.provider === 'paypal') {
    if (!configuredPayPal()) throw new Error('PayPal is not configured.');
    const token = await paypalAccessToken();
    const r = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(order.provider_order_id)}`, { headers: { Authorization: `Bearer ${token}` } });
    const p = await r.json();
    if (!r.ok) throw new Error(p.message || 'Unable to read PayPal order.');
    const cap = (p.purchase_units || []).flatMap((u) => u.payments?.captures || [])[0];
    if (!cap) return { captureId: '', fee: null, net: null };
    const b = cap.seller_receivable_breakdown || {};
    return { captureId: cap.id, fee: money(b.paypal_fee?.value), net: money(b.net_amount?.value), paidAt: cap.create_time };
  }
  if (order.provider === 'stripe') {
    if (!configuredStripe()) throw new Error('Stripe is not configured.');
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.provider_order_id)}?expand[]=payment_intent.latest_charge.balance_transaction`, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error?.message || 'Unable to read Stripe session.');
    const pi = p.payment_intent; const bt = pi?.latest_charge?.balance_transaction;
    if (!pi?.id) return { captureId: '', fee: null, net: null };
    return { captureId: pi.id, fee: bt ? bt.fee / 100 : null, net: bt ? bt.net / 100 : null, paidAt: pi.created ? pi.created * 1000 : null };
  }
  throw new Error('Unknown payment provider.');
}

// Issue a full or partial refund. Returns { id, amount, debit, status }.
export async function refundPayment(order, amount, reason = '', requestId = '') {
  const value = Math.round(Number(amount) * 100) / 100;
  const remaining = Math.round((Number(order.total) - Number(order.refunded_amount || 0)) * 100) / 100;
  if (!(value > 0) || value > remaining + 0.001) throw new Error(`Refund must be between $0.01 and $${remaining.toFixed(2)}.`);
  if (!order.capture_id) throw new Error('No captured payment on this order. Sync settlement first.');
  if (order.provider === 'paypal') {
    const token = await paypalAccessToken();
    const r = await fetch(`${paypalBaseUrl()}/v2/payments/captures/${encodeURIComponent(order.capture_id)}/refund`, {
      signal: AbortSignal.timeout(20000),
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', 'PayPal-Request-Id': requestId || `refund-${order.id}-${Date.now()}` },
      body: JSON.stringify({ amount: { currency_code: 'USD', value: value.toFixed(2) }, note_to_payer: String(reason || 'Refund from PATZCOM').slice(0, 255) }),
    });
    const p = await r.json();
    if (!r.ok || !p.id || !['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED'].includes(p.status)) throw new Error(p.details?.[0]?.description || p.message || 'PayPal refund needs review.');
    if (p.amount && (p.amount.currency_code !== 'USD' || Math.round(Number(p.amount.value) * 100) !== Math.round(value * 100))) throw new Error('PayPal refund amount mismatch.');
    const debit = money(p.seller_payable_breakdown?.net_amount?.value) ?? value;
    return { id: p.id, amount: value, debit, feeReturned: money(p.seller_payable_breakdown?.paypal_fee?.value) ?? 0, status: p.status };
  }
  if (order.provider === 'stripe') {
    const body = `payment_intent=${encodeURIComponent(order.capture_id)}&amount=${Math.round(value * 100)}&metadata[reason]=${encodeURIComponent(String(reason || '').slice(0, 200))}`;
    const r = await fetch('https://api.stripe.com/v1/refunds', { method: 'POST', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `refund-${order.id}-${Date.now()}` }, body });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error?.message || 'Stripe refund failed.');
    return { id: p.id, amount: value, debit: value, feeReturned: 0, status: p.status };
  }
  throw new Error('Unknown payment provider.');
}

export async function retrievePayPalRefund(id) {
  if (!/^[A-Za-z0-9-]{6,80}$/.test(String(id))) throw new Error('Invalid refund ID.');
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/payments/refunds/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
  });
  const refund = await response.json();
  if (!response.ok || refund.id !== id || !['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED'].includes(refund.status) || refund.amount?.currency_code !== 'USD') throw new Error('Unable to verify the PayPal refund.');
  return { id: refund.id, status: refund.status, amount: money(refund.amount.value),
    debit: money(refund.seller_payable_breakdown?.net_amount?.value) ?? money(refund.amount.value) };
}

export function getPaymentConfig() {
  return {
    currency: 'USD',
    paypal: {
      enabled: configuredPayPal(),
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      environment: process.env.PAYPAL_ENV || 'live',
    },
    stripe: { enabled: configuredStripe() },
    priority: ['paypal', 'stripe'],
  };
}
