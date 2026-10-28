import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { getOtpSecrets } from '../config/email.js';
import { renderOtpEmail } from '../email/templates.js';
import { AppError } from '../utils/errors.js';
import {
  constantTimeEqual,
  createSixDigitCode,
  hmacSecret,
} from '../utils/secureToken.js';
import { sendEmail } from './email-transport.service.js';
import { consumeRateLimit } from './security-throttle.service.js';

const OTP_TTL_MS = 300_000;
const RESEND_COOLDOWN_MS = 60_000;
const SEND_WINDOW_MS = 15 * 60_000;

function challengeHash({ id, email, purpose, code }) {
  const { otpSecret } = getOtpSecrets();
  return hmacSecret(`${id}:${email}:${purpose}:${code}`, otpSecret, 'email-otp:v1');
}

function otpError(status) {
  if (status === 'EXPIRED') return new AppError('Mã xác thực đã hết hạn.', 410, 'OTP_EXPIRED');
  if (status === 'LOCKED') return new AppError('Mã xác thực đã bị khóa.', 423, 'OTP_LOCKED');
  if (status === 'USED') return new AppError('Mã xác thực đã được sử dụng.', 409, 'OTP_ALREADY_USED');
  if (status === 'CONTEXT') return new AppError('Mã xác thực không thuộc yêu cầu này.', 409, 'CHALLENGE_CONTEXT_MISMATCH');
  return new AppError('Mã xác thực không đúng.', 400, 'OTP_INVALID');
}

export async function sendEmailChallenge({
  purpose,
  email,
  checkoutIntentId = null,
  userId = null,
  actorKey,
  ip,
  now = new Date(),
}) {
  const contextWhere = purpose === 'CHECKOUT'
    ? { checkoutIntentId, purpose }
    : { userId, purpose };
  const latest = await prisma.emailChallenge.findFirst({
    where: { ...contextWhere, invalidatedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (latest?.resendAvailableAt > now) {
    const error = new AppError('Vui lòng chờ trước khi gửi lại mã.', 429, 'OTP_COOLDOWN');
    error.retryAfterSeconds = Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000);
    throw error;
  }

  // Email scope deliberately excludes intent id: making a new intent cannot reset this quota.
  try {
    await consumeRateLimit({ scope: `OTP_${purpose}_EMAIL`, identifier: email, limit: 3, windowMs: SEND_WINDOW_MS, now });
    await consumeRateLimit({ scope: `OTP_${purpose}_ACTOR`, identifier: actorKey, limit: 3, windowMs: SEND_WINDOW_MS, now });
    await consumeRateLimit({ scope: `OTP_${purpose}_IP`, identifier: ip, limit: 20, windowMs: SEND_WINDOW_MS, now });
  } catch (error) {
    if (error?.code === 'RATE_LIMITED') error.code = 'OTP_RATE_LIMITED';
    throw error;
  }

  const id = randomUUID();
  const code = createSixDigitCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS);
  const codeHash = challengeHash({ id, email, purpose, code });

  await prisma.$transaction(async (tx) => {
    await tx.emailChallenge.updateMany({
      where: { ...contextWhere, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.emailChallenge.create({
      data: {
        id,
        purpose,
        checkoutIntentId,
        userId,
        email,
        codeHash,
        expiresAt,
        resendAvailableAt,
      },
    });
  });

  try {
    const emailContent = renderOtpEmail({
      code,
      purpose: purpose === 'PASSWORD_SETUP' ? 'password-setup' : 'checkout',
    });
    await sendEmail({ to: email, ...emailContent });
  } catch {
    await prisma.emailChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { invalidatedAt: new Date() },
    });
    throw new AppError('Không thể gửi email xác thực lúc này.', 503, 'EMAIL_DELIVERY_UNAVAILABLE');
  }

  return { challengeId: id, expiresAt, resendAvailableAt };
}

export async function consumeEmailChallenge({
  challengeId,
  code,
  purpose,
  checkoutIntentId = null,
  userId = null,
  onVerified,
  now = new Date(),
}) {
  if (typeof challengeId !== 'string' || !challengeId || !/^\d{6}$/.test(String(code || ''))) {
    throw otpError('INVALID');
  }

  const result = await prisma.$transaction(async (tx) => {
    const challenge = await tx.emailChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== purpose) return { status: 'CONTEXT' };
    if (
      (purpose === 'CHECKOUT' && challenge.checkoutIntentId !== checkoutIntentId)
      || (purpose === 'PASSWORD_SETUP' && challenge.userId !== userId)
    ) return { status: 'CONTEXT' };
    if (challenge.consumedAt) return { status: 'USED' };
    if (challenge.attemptsRemaining <= 0) return { status: 'LOCKED' };
    if (challenge.invalidatedAt) return { status: 'INVALID' };
    if (challenge.expiresAt <= now) {
      await tx.emailChallenge.update({ where: { id: challenge.id }, data: { invalidatedAt: now } });
      return { status: 'EXPIRED' };
    }
    const actualHash = challengeHash({
      id: challenge.id,
      email: challenge.email,
      purpose,
      code: String(code),
    });
    if (!constantTimeEqual(actualHash, challenge.codeHash)) {
      const remaining = challenge.attemptsRemaining - 1;
      const updated = await tx.emailChallenge.updateMany({
        where: {
          id: challenge.id,
          attemptsRemaining: challenge.attemptsRemaining,
          consumedAt: null,
          invalidatedAt: null,
        },
        data: {
          attemptsRemaining: remaining,
          ...(remaining === 0 ? { invalidatedAt: now } : {}),
        },
      });
      return { status: remaining === 0 ? 'LOCKED' : 'INVALID', raced: updated.count === 0 };
    }

    const consumed = await tx.emailChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, invalidatedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) return { status: 'USED' };
    if (onVerified) await onVerified(tx, challenge, now);
    return { status: 'VERIFIED', challenge };
  });

  if (result.status !== 'VERIFIED') throw otpError(result.status);
  return result.challenge;
}
