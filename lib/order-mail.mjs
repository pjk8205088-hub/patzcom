import nodemailer from 'nodemailer';

const sellerInbox = process.env.PATZCOM_ORDER_NOTIFY_TO || 'partscombined@gmail.com';
const publicAddress = process.env.PATZCOM_PUBLIC_EMAIL || 'sales@patzcom.com';
const site = (process.env.PATZCOM_PUBLIC_URL || 'https://www.patzcom.com').replace(/\/$/, '');

export function orderMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;

function trackingUrl(number) {
  const n = String(number || '').replace(/\s+/g, '');
  if (/^1Z[0-9A-Z]{16}$/i.test(n)) return `https://www.ups.com/track?tracknum=${n}`;
  if (/^(94|93|92|95)\d{20}$/.test(n)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (/^\d{12}$|^\d{15}$/.test(n)) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (/^\d{10}$/.test(n)) return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
  return `https://parcelsapp.com/en/tracking/${encodeURIComponent(n)}`;
}

function formatAddress(a) {
  if (!a) return '';
  return [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(', '), a.country].filter(Boolean).join('\n');
}

function itemsHtml(order) {
  return (order.items || []).map((i) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.image ? `<img src="${esc(i.image)}" width="64" height="64" style="object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:10px">` : ''}${esc(i.title)}<br><span style="color:#777;font-size:12px">Qty ${i.quantity} × ${usd(i.unitAmount)}</span></td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${usd(i.quantity * i.unitAmount)}</td></tr>`).join('');
}

function layout(title, body) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#191919">
  <div style="padding:18px 0;border-bottom:3px solid #3665f3"><strong style="font-size:24px">PATZCOM</strong></div>
  <h2 style="margin:22px 0 10px">${esc(title)}</h2>${body}
  <p style="color:#777;font-size:12px;margin-top:30px">Questions? Reply to this email or visit <a href="${site}/contact.html">${site.replace('https://', '')}</a>.</p></div>`;
}

export async function sendOrderConfirmation(order) {
  if (!order?.buyer_email) throw new Error('Order has no buyer email.');
  const addr = formatAddress(order.shipping_address);
  const html = layout('Thanks for your order!', `
    <p>Hi ${esc(order.buyer_name || 'there')}, we received your payment. We'll email you again with tracking as soon as your order ships.</p>
    <p><b>Order:</b> ${esc(order.reference)}<br><b>Paid with:</b> ${esc(order.provider === 'paypal' ? 'PayPal' : 'Card (Stripe)')}</p>
    <table width="100%" style="border-collapse:collapse">${itemsHtml(order)}
      <tr><td style="padding:6px 0">Subtotal</td><td style="text-align:right">${usd(order.subtotal)}</td></tr>
      <tr><td style="padding:6px 0">Shipping</td><td style="text-align:right">${usd(order.shipping)}</td></tr>
      <tr><td style="padding:6px 0"><b>Total</b></td><td style="text-align:right"><b>${usd(order.total)}</b></td></tr></table>
    ${addr ? `<p><b>Ship to:</b><br>${esc(addr).replace(/\n/g, '<br>')}</p>` : ''}`);
  await transport().sendMail({
    from: `PATZCOM <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: order.buyer_email,
    replyTo: publicAddress,
    subject: `Order confirmed: ${order.reference}`,
    html,
    text: `Thanks for your order ${order.reference}. Total ${usd(order.total)}. We'll email tracking when it ships.`,
  });
}

export async function sendShippedNotice(order) {
  if (!order?.buyer_email) throw new Error('Order has no buyer email.');
  const url = trackingUrl(order.tracking_number);
  const html = layout('Your order has shipped', `
    <p>Hi ${esc(order.buyer_name || 'there')}, good news. Order <b>${esc(order.reference)}</b> is on its way.</p>
    <p style="font-size:16px"><b>Tracking number:</b> ${esc(order.tracking_number)}</p>
    <p><a href="${esc(url)}" style="display:inline-block;background:#3665f3;color:#fff;padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Track package</a></p>
    <table width="100%" style="border-collapse:collapse">${itemsHtml(order)}</table>`);
  await transport().sendMail({
    from: `PATZCOM <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: order.buyer_email,
    replyTo: publicAddress,
    subject: `Shipped: ${order.reference} (tracking ${order.tracking_number})`,
    html,
    text: `Your order ${order.reference} shipped. Tracking: ${order.tracking_number} ${url}`,
  });
}

export async function sendSellerNewOrder(order) {
  const addr = formatAddress(order.shipping_address);
  await transport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: sellerInbox,
    replyTo: order.buyer_email || undefined,
    subject: `[PATZCOM 새 주문] ${order.reference} ${usd(order.total)}`,
    text: `새 결제 완료 주문\n\n주문: ${order.reference}\n결제: ${order.provider} ${order.provider_order_id || ''}\n금액: ${usd(order.total)}\n구매자: ${order.buyer_name || '-'} <${order.buyer_email || '-'}>\n배송지:\n${addr || '-'}\n\n상품:\n${(order.items || []).map((i) => `- ${i.quantity} x ${i.title} (${usd(i.unitAmount)})`).join('\n')}\n\n관리자: ${site}/admin.html#orders/awaiting`,
  });
}
