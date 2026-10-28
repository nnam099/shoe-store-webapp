import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { renderPasswordChangedEmail } from '../email/templates.js';
import { AppError } from '../utils/errors.js';
import { comparePassword, hashPassword, PASSWORD_HASH_ROUNDS, validatePasswordConfirmation } from '../utils/password.js';
import { assertMemberAuthConfigured, issueMemberToken } from '../utils/memberToken.js';
import { consumeEmailChallenge, sendEmailChallenge } from './email-challenge.service.js';
import { enqueueEmail } from './email-outbox.service.js';
import { isValidPhone } from './order.service.js';

const EMAIL_MAX_LENGTH = 150;
const FULL_NAME_MAX_LENGTH = 100;
const PHONE_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('steplab-invalid-member-password', PASSWORD_HASH_ROUNDS);
const identityInclude = { externalIdentities: { select: { provider: true } } };

export function serializePublicMember(user) {
  const authMethods = [];
  if (user.passwordHash) authMethods.push('PASSWORD');
  if (user.externalIdentities?.some((identity) => identity.provider === 'GOOGLE')) authMethods.push('GOOGLE');
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    hasPassword: Boolean(user.passwordHash),
    authMethods,
    profileComplete: Boolean(user.fullName && user.phone),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function normalizeMemberEmail(email) {
  if (typeof email !== 'string') throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    throw new AppError('Email is invalid', 400, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizeFullName(fullName) {
  if (typeof fullName !== 'string') throw new AppError('Full name is required', 400, 'VALIDATION_ERROR');
  const normalized = fullName.trim();
  if (!normalized || normalized.length > FULL_NAME_MAX_LENGTH) {
    throw new AppError('Full name must be between 1 and 100 characters', 400, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') throw new AppError('Phone is required', 400, 'VALIDATION_ERROR');
  const normalized = phone.trim();
  if (normalized.length > PHONE_MAX_LENGTH || !isValidPhone(normalized)) {
    throw new AppError('Phone is invalid', 400, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizeAddress(address) {
  if (address === null || address === undefined) return null;
  if (typeof address !== 'string') throw new AppError('Address must be a string or null', 400, 'VALIDATION_ERROR');
  const normalized = address.trim();
  if (normalized.length > ADDRESS_MAX_LENGTH) throw new AppError('Address is too long', 400, 'VALIDATION_ERROR');
  return normalized || null;
}

function accountExistsError() {
  return new AppError('Tài khoản đã tồn tại.', 409, 'ACCOUNT_EXISTS');
}

function invalidCredentialsError() {
  return new AppError('Sai thông tin đăng nhập.', 401, 'INVALID_CREDENTIALS');
}

export async function registerMember(input) {
  assertMemberAuthConfigured();
  const fullName = normalizeFullName(input?.fullName);
  const email = normalizeMemberEmail(input?.email);
  const phone = normalizePhone(input?.phone);
  validatePasswordConfirmation(input?.password, input?.passwordConfirmation);
  if (await prisma.user.findUnique({ where: { email } })) throw accountExistsError();
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({ data: { fullName, email, phone, passwordHash }, include: identityInclude });
    return { member: serializePublicMember(user), token: issueMemberToken(user) };
  } catch (error) {
    if (error?.code === 'P2002') throw accountExistsError();
    throw error;
  }
}

export async function loginMember(input) {
  assertMemberAuthConfigured();
  const email = normalizeMemberEmail(input?.email);
  if (typeof input?.password !== 'string' || !input.password) throw invalidCredentialsError();
  const user = await prisma.user.findUnique({ where: { email }, include: identityInclude });
  const passwordMatches = await comparePassword(input.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) throw invalidCredentialsError();
  if (!user.isActive) throw new AppError('Tài khoản hiện không hoạt động.', 403, 'ACCOUNT_INACTIVE');
  return { member: serializePublicMember(user), token: issueMemberToken(user) };
}

export async function getCurrentMember(memberId) {
  const user = await prisma.user.findUnique({ where: { id: memberId }, include: identityInclude });
  if (!user || !user.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  return serializePublicMember(user);
}

export async function updateMemberProfile(memberId, input) {
  const allowedFields = new Set(['fullName', 'phone', 'address']);
  const keys = Object.keys(input || {});
  const unsupportedFields = keys.filter((key) => !allowedFields.has(key));
  if (unsupportedFields.length) {
    throw new AppError('Profile contains unsupported fields', 400, 'VALIDATION_ERROR', [{ fields: unsupportedFields }]);
  }
  if (!keys.length) throw new AppError('At least one profile field is required', 400, 'VALIDATION_ERROR');
  const data = {};
  if (Object.hasOwn(input, 'fullName')) data.fullName = normalizeFullName(input.fullName);
  if (Object.hasOwn(input, 'phone')) data.phone = normalizePhone(input.phone);
  if (Object.hasOwn(input, 'address')) data.address = normalizeAddress(input.address);
  const user = await prisma.user.update({ where: { id: memberId }, data, include: identityInclude });
  return serializePublicMember(user);
}

export async function changeMemberPassword(memberId, input) {
  validatePasswordConfirmation(input?.newPassword, input?.newPasswordConfirmation, 'newPassword');
  if (typeof input?.currentPassword !== 'string' || !input.currentPassword) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user || !user.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  if (!user.passwordHash) {
    throw new AppError('Tài khoản chưa có mật khẩu. Vui lòng thiết lập mật khẩu trước.', 409, 'PASSWORD_NOT_SET');
  }
  if (!(await comparePassword(input.currentPassword, user.passwordHash))) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  if (await comparePassword(input.newPassword, user.passwordHash)) {
    throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  const passwordHash = await hashPassword(input.newPassword);
  const rendered = renderPasswordChangedEmail({ fullName: user.fullName, action: 'change' });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: memberId }, data: { passwordHash, authVersion: { increment: 1 } } });
    await enqueueEmail(tx, {
      eventKey: `password.changed:${updated.id}:${updated.authVersion}`,
      recipient: updated.email,
      ...rendered,
    });
  });
  return { message: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.' };
}

export async function sendPasswordSetupOtp(memberId, { ip } = {}) {
  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user || !user.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  if (user.passwordHash) throw new AppError('Tài khoản đã có mật khẩu.', 409, 'PASSWORD_ALREADY_SET');
  return sendEmailChallenge({
    purpose: 'PASSWORD_SETUP', email: user.email, userId: user.id,
    actorKey: `member:${user.id}`, ip: ip || 'unknown',
  });
}

export async function setupMemberPassword(memberId, input) {
  validatePasswordConfirmation(input?.newPassword, input?.newPasswordConfirmation, 'newPassword');
  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user || !user.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  if (user.passwordHash) throw new AppError('Tài khoản đã có mật khẩu.', 409, 'PASSWORD_ALREADY_SET');
  const passwordHash = await hashPassword(input.newPassword);
  const rendered = renderPasswordChangedEmail({ fullName: user.fullName, action: 'setup' });
  await consumeEmailChallenge({
    challengeId: input?.challengeId,
    code: input?.otp,
    purpose: 'PASSWORD_SETUP',
    userId: user.id,
    onVerified: async (tx, challenge) => {
      if (challenge.email !== user.email) {
        throw new AppError('Mã xác thực không thuộc tài khoản này.', 409, 'CHALLENGE_CONTEXT_MISMATCH');
      }
      const changed = await tx.user.updateMany({
        where: { id: user.id, passwordHash: null, isActive: true },
        data: { passwordHash, authVersion: { increment: 1 } },
      });
      if (changed.count !== 1) throw new AppError('Tài khoản đã có mật khẩu.', 409, 'PASSWORD_ALREADY_SET');
      const updated = await tx.user.findUnique({ where: { id: user.id } });
      await enqueueEmail(tx, {
        eventKey: `password.changed:${updated.id}:${updated.authVersion}`,
        recipient: updated.email,
        ...rendered,
      });
    },
  });
  return { message: 'Mật khẩu đã được thiết lập. Vui lòng đăng nhập lại.' };
}
