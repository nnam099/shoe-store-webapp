import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { isValidPhone } from './order.service.js';
import { AppError } from '../utils/errors.js';
import {
  comparePassword,
  hashPassword,
  PASSWORD_HASH_ROUNDS,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/password.js';
import {
  assertMemberAuthConfigured,
  issueMemberToken,
} from '../utils/memberToken.js';

const EMAIL_MAX_LENGTH = 150;
const FULL_NAME_MAX_LENGTH = 100;
const PHONE_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'steplab-invalid-member-password',
  PASSWORD_HASH_ROUNDS
);
const FORGOT_PASSWORD_MESSAGE =
  'Nếu tài khoản tồn tại, mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.';

export function serializePublicMember(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  const normalized = email.trim().toLowerCase();
  if (
    !normalized
    || normalized.length > EMAIL_MAX_LENGTH
    || !EMAIL_PATTERN.test(normalized)
  ) {
    throw new AppError('Email is invalid', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizeFullName(fullName) {
  if (typeof fullName !== 'string') {
    throw new AppError('Full name is required', 400, 'VALIDATION_ERROR');
  }

  const normalized = fullName.trim();
  if (!normalized || normalized.length > FULL_NAME_MAX_LENGTH) {
    throw new AppError('Full name must be between 1 and 100 characters', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') {
    throw new AppError('Phone is required', 400, 'VALIDATION_ERROR');
  }

  const normalized = phone.trim();
  if (normalized.length > PHONE_MAX_LENGTH || !isValidPhone(normalized)) {
    throw new AppError('Phone is invalid', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

function normalizeAddress(address) {
  if (address === null || address === undefined) return null;
  if (typeof address !== 'string') {
    throw new AppError('Address must be a string or null', 400, 'VALIDATION_ERROR');
  }

  const normalized = address.trim();
  if (normalized.length > ADDRESS_MAX_LENGTH) {
    throw new AppError('Address is too long', 400, 'VALIDATION_ERROR');
  }

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
  const email = normalizeEmail(input?.email);
  const phone = normalizePhone(input?.phone);
  validatePasswordConfirmation(input?.password, input?.passwordConfirmation);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw accountExistsError();

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
      },
    });

    return {
      member: serializePublicMember(user),
      token: issueMemberToken(user),
    };
  } catch (error) {
    if (error?.code === 'P2002') throw accountExistsError();
    throw error;
  }
}

export async function loginMember(input) {
  assertMemberAuthConfigured();

  const email = normalizeEmail(input?.email);
  if (typeof input?.password !== 'string' || !input.password) {
    throw invalidCredentialsError();
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await comparePassword(
    input.password,
    user?.passwordHash || DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordMatches) throw invalidCredentialsError();

  return {
    member: serializePublicMember(user),
    token: issueMemberToken(user),
  };
}

export async function getCurrentMember(memberId) {
  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  return serializePublicMember(user);
}

export async function updateMemberProfile(memberId, input) {
  const allowedFields = new Set(['fullName', 'phone', 'address']);
  const keys = Object.keys(input || {});
  const unsupportedFields = keys.filter((key) => !allowedFields.has(key));

  if (unsupportedFields.length > 0) {
    throw new AppError('Profile contains unsupported fields', 400, 'VALIDATION_ERROR', [
      { fields: unsupportedFields },
    ]);
  }

  if (keys.length === 0) {
    throw new AppError('At least one profile field is required', 400, 'VALIDATION_ERROR');
  }

  const data = {};
  if (Object.hasOwn(input, 'fullName')) data.fullName = normalizeFullName(input.fullName);
  if (Object.hasOwn(input, 'phone')) data.phone = normalizePhone(input.phone);
  if (Object.hasOwn(input, 'address')) data.address = normalizeAddress(input.address);

  const user = await prisma.user.update({
    where: { id: memberId },
    data,
  });

  return serializePublicMember(user);
}

export async function changeMemberPassword(memberId, input) {
  validatePasswordConfirmation(input?.newPassword, input?.newPasswordConfirmation, 'newPassword');

  if (typeof input?.currentPassword !== 'string' || !input.currentPassword) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }

  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');

  const currentPasswordMatches = await comparePassword(
    input.currentPassword,
    user.passwordHash
  );
  if (!currentPasswordMatches) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }

  const reusesCurrentPassword = await comparePassword(
    input.newPassword,
    user.passwordHash
  );
  if (reusesCurrentPassword) {
    throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại.', 400, 'PASSWORD_CHANGE_FAILED');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: memberId },
    data: { passwordHash },
  });

  return {
    message: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
  };
}

/**
 * Intentionally simplified course-scope reset flow. It is not production-grade:
 * no email delivery, OTP, verification link, or reset token is used.
 */
export async function forgotMemberPassword(input) {
  assertMemberAuthConfigured();

  const email = normalizeEmail(input?.email);
  validatePasswordConfirmation(input?.newPassword, input?.newPasswordConfirmation, 'newPassword');

  // Hash before the update so known and unknown emails follow the same costly path.
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.updateMany({
    where: { email },
    data: { passwordHash },
  });

  return { message: FORGOT_PASSWORD_MESSAGE };
}
