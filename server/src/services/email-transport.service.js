import nodemailer from 'nodemailer';
import { getEmailConfig } from '../config/email.js';

let transporter;
let transporterSignature;

function getTransporter() {
  const config = getEmailConfig();
  const signature = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (!transporter || transporterSignature !== signature) {
    transporter?.close?.();
    transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      connectionTimeout: config.connectionTimeout,
      socketTimeout: config.socketTimeout,
      auth: { user: config.user, pass: config.pass },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    transporterSignature = signature;
  }
  return { transporter, config };
}

export async function sendEmail({ to, subject, text, html, messageId }) {
  const current = getTransporter();
  const result = await current.transporter.sendMail({
    from: { name: current.config.fromName, address: current.config.fromAddress },
    to,
    subject,
    text,
    html,
    ...(messageId ? { messageId } : {}),
  });
  return { messageId: result.messageId || null };
}

export function closeEmailTransport() {
  transporter?.close?.();
  transporter = undefined;
  transporterSignature = undefined;
}
