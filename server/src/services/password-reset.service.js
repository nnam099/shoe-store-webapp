import prisma from '../config/db.js';
import { getEmailConfig } from '../config/email.js';
import {
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
} from '../email/templates.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, validatePasswordConfirmation } from '../utils/password.js';
import { createOpaqueToken, hashOpaqueToken } from '../utils/secureToken.js';
import { buildPasswordResetUrl } from '../utils/passwordResetUrl.js';
import { sendEmail } from './email-transport.service.js';
import { enqueueEmail } from './email-outbox.service.js';
import { consumeRateLimit } from './security-throttle.service.js';

const RESET_TTL_MS = 15 * 60_000;
const NEUTRAL_MESSAGE = 'Nếu tài khoản phù hợp tồn tại, STEP/LAB đã gửi hướng dẫn đặt lại mật khẩu.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  if (typeof value !== 'string') throw new AppError('Email không hợp lệ.', 400, 'VALIDATION_ERROR');
  const email = value.trim().toLowerCase();
  if (!email || email.length > 150 || !EMAIL_PATTERN.test(email)) {
    throw new AppError('Email không hợp lệ.', 400, 'VALIDATION_ERROR');
  }
  return email;
}

export async function requestPasswordReset(input, { ip, now = new Date() } = {}) {
  const unsupported = Object.keys(input || {}).filter((key) => key !== 'email');
  if (unsupported.length) {
    throw new AppError('Password reset request contains unsupported fields.', 400, 'VALIDATION_ERROR');
  }
  const email = normalizeEmail(input?.email);
  await consumeRateLimit({ scope: 'PASSWORD_RESET_EMAIL', identifier: email, limit: 3, windowMs: 60 * 60_000, now });
  await consumeRateLimit({ scope: 'PASSWORD_RESET_IP', identifier: ip || 'unknown', limit: 10, windowMs: 15 * 60_000, now });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.isActive) return { message: NEUTRAL_MESSAGE };

  const rawToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  const tokenRecord = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });
    return tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  });

  try {
    const { appBaseUrl } = getEmailConfig();
    // Put the secret in the URL fragment so it is not sent in HTTP request/access logs.
    const resetUrl = buildPasswordResetUrl(appBaseUrl, rawToken);
    const content = renderPasswordResetEmail({ resetUrl });
    await sendEmail({ to: email, ...content });
  } catch {
    // A timeout may mean delivery status is ambiguous. Invalidate the token so a
    // possibly-delivered link cannot be used; never persist or retry its secret URL.
    await prisma.passwordResetToken.updateMany({
      where: { id: tokenRecord.id, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  return { message: NEUTRAL_MESSAGE };
}

export async function resetPassword(input, { now = new Date() } = {}) {
  if (typeof input?.token !== 'string' || !input.token.trim()) {
    throw new AppError('Liên kết đặt lại mật khẩu không hợp lệ.', 400, 'RESET_TOKEN_INVALID');
  }
  validatePasswordConfirmation(input?.newPassword, input?.newPasswordConfirmation, 'newPassword');
  const tokenHash = hashOpaqueToken(input.token.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.usedAt || !record.user.isActive) {
    throw new AppError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.', 400, 'RESET_TOKEN_INVALID');
  }
  if (record.expiresAt <= now) {
    throw new AppError('Liên kết đặt lại mật khẩu đã hết hạn.', 410, 'RESET_TOKEN_EXPIRED');
  }

  const passwordHash = await hashPassword(input.newPassword);
  const rendered = renderPasswordChangedEmail({ fullName: record.user.fullName, action: 'reset' });
  const changed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    const user = await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    await enqueueEmail(tx, {
      eventKey: `password.changed:${user.id}:${user.authVersion}`,
      recipient: user.email,
      ...rendered,
    });
    return true;
  });
  if (!changed) throw new AppError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.', 400, 'RESET_TOKEN_INVALID');
  return { message: 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.' };
}
