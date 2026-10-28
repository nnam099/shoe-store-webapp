import 'dotenv/config';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getEmailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const fromAddress = process.env.MAIL_FROM_ADDRESS?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim() || 'STEP/LAB';
  const appBaseUrl = process.env.APP_BASE_URL?.trim()?.replace(/\/$/, '');
  const port = positiveInteger(process.env.SMTP_PORT, 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (!host || !user || !pass || !fromAddress || !appBaseUrl) {
    const error = new Error('SMTP and application URL configuration is incomplete.');
    error.code = 'EMAIL_CONFIGURATION_ERROR';
    throw error;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromAddress,
    fromName,
    appBaseUrl,
    connectionTimeout: positiveInteger(process.env.SMTP_CONNECTION_TIMEOUT_MS, 10_000),
    socketTimeout: positiveInteger(process.env.SMTP_SOCKET_TIMEOUT_MS, 15_000),
  };
}

export function getEmailWorkerConfig() {
  return {
    intervalMs: positiveInteger(process.env.EMAIL_WORKER_INTERVAL_MS, 10_000),
    batchSize: Math.min(100, positiveInteger(process.env.EMAIL_WORKER_BATCH_SIZE, 20)),
  };
}

export function getOtpSecrets() {
  const otpSecret = process.env.OTP_HMAC_SECRET;
  const securitySecret = process.env.SECURITY_HASH_SECRET;
  if (!otpSecret || otpSecret.length < 32 || !securitySecret || securitySecret.length < 32) {
    const error = new Error('OTP_HMAC_SECRET and SECURITY_HASH_SECRET must contain at least 32 characters.');
    error.code = 'EMAIL_SECURITY_CONFIGURATION_ERROR';
    throw error;
  }
  return { otpSecret, securitySecret };
}
