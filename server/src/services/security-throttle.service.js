import prisma from '../config/db.js';
import { getOtpSecrets } from '../config/email.js';
import { AppError } from '../utils/errors.js';
import { hmacSecret } from '../utils/secureToken.js';

export function normalizeClientIp(req) {
  // Express only derives req.ip from forwarding headers when a reviewed
  // trust-proxy hop count is configured in app.js.
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export async function consumeRateLimit({ scope, identifier, limit, windowMs, now = new Date(), db = prisma }) {
  const { securitySecret } = getOtpSecrets();
  const keyHash = hmacSecret(String(identifier), securitySecret, `rate-limit:${scope}`);
  const cutoff = new Date(now.getTime() - windowMs);
  const blockedUntil = new Date(now.getTime() + windowMs);

  const rows = await db.$queryRaw`
    INSERT INTO "security_throttles"
      ("scope", "key_hash", "window_start", "count", "blocked_until", "updated_at")
    VALUES (${scope}, ${keyHash}, ${now}, 1, NULL, ${now})
    ON CONFLICT ("scope", "key_hash") DO UPDATE SET
      "window_start" = CASE
        WHEN "security_throttles"."window_start" <= ${cutoff} THEN ${now}
        ELSE "security_throttles"."window_start"
      END,
      "count" = CASE
        WHEN "security_throttles"."window_start" <= ${cutoff} THEN 1
        ELSE "security_throttles"."count" + 1
      END,
      "blocked_until" = CASE
        WHEN "security_throttles"."window_start" <= ${cutoff} THEN NULL
        WHEN "security_throttles"."count" + 1 > ${limit} THEN ${blockedUntil}
        ELSE "security_throttles"."blocked_until"
      END,
      "updated_at" = ${now}
    RETURNING "count", "blocked_until"
  `;

  const record = rows[0];
  if (Number(record?.count) > limit || (record?.blocked_until && record.blocked_until > now)) {
    const error = new AppError('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.', 429, 'RATE_LIMITED');
    error.retryAfterSeconds = Math.ceil(windowMs / 1000);
    throw error;
  }
}
