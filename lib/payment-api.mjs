import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.join(process.cwd(), 'work', 'abc11-site_1', 'site');
const productsPath = path.join(siteRoot, 'assets', 'products.json');
const pendingPayPalOrders = new Map();

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
  return JSON.parse(await readFile(productsPath, 'utf8'));
}

export async function buildVerifiedCart(items) {
  const requested = cleanCartItems(items);
  const products = await loadProducts();
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const lines = requested.map(({ id, quantity }) => {
    const product = byId.get(id);
    if (!product) throw new Error('One or more cart products are no longer available.');
    if (product.available === false) throw new Error(`${product.title} is currently out of stock.`);
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

async function paypalAccessToken() {
  if (!configuredPayPal()) throw new Error('PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Railway.');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
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
  pendingPayPalOrders.set(payload.id, { createdAt: Date.now(), total: cart.total });
  return { id: payload.id, reference: cart.reference, total: cart.total };
}

export async function capturePayPalOrder(orderId) {
  const id = String(orderId || '').trim();
  if (!/^[A-Z0-9-]{8,80}$/i.test(id)) throw new Error('Invalid PayPal order ID.');
  const pending = pendingPayPalOrders.get(id);
  if (!pending || Date.now() - pending.createdAt > 30 * 60 * 1000) {
    pendingPayPalOrders.delete(id);
    throw new Error('This PayPal checkout session has expired. Please start checkout again.');
  }
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: '{}',
  });
  const payload = await response.json();
  if (!response.ok || !['COMPLETED', 'PENDING'].includes(payload.status)) {
    throw new Error(payload.message || 'Unable to capture the PayPal payment.');
  }
  pendingPayPalOrders.delete(id);
  return { id: payload.id, status: payload.status, reference: payload.purchase_units?.[0]?.custom_id || null };
}

function publicBaseUrl() {
  const value = process.env.PATZCOM_PUBLIC_URL || 'https://www.patzcom.com';
  return value.replace(/\/$/, '');
}

function stripeFormValue(value) {
  return encodeURIComponent(String(value));
}

export async function createStripeCheckoutSession(cartItems) {
  if (!configuredStripe()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Railway.');
  const cart = await buildVerifiedCart(cartItems);
  const fields = [
    ['mode', 'payment'],
    ['success_url', `${publicBaseUrl()}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`],
    ['cancel_url', `${publicBaseUrl()}/cart.html?payment=cancelled`],
    ['client_reference_id', cart.reference],
    ['billing_address_collection', 'auto'],
    ['phone_number_collection[enabled]', 'true'],
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
  return { id: payload.id, url: payload.url, reference: cart.reference, total: cart.total };
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
