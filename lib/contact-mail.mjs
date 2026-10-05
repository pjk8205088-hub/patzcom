import nodemailer from 'nodemailer';

const destination = 'partscombined@gmail.com';

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendContactMessage(message) {
  if (!configured()) throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in Railway.');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destination,
    replyTo: message.email,
    subject: `[PATZCOM 문의] ${message.name}`,
    text: `Name: ${message.name}\nEmail: ${message.email}\nVehicle: ${message.vehicle || '-'}\n\n${message.message}`,
  });
}

export function contactMailConfigured() { return configured(); }
