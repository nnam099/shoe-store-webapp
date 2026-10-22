import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  comparePassword,
  hashPassword,
  PASSWORD_HASH_ROUNDS,
  validatePasswordConfirmation,
} from '../utils/password.js';
import { assertAdminAuthConfigured, issueAdminToken } from '../utils/adminToken.js';
import { assertAllowedFields, normalizeEmail } from '../utils/adminValidation.js';

const DUMMY_HASH = bcrypt.hashSync('steplab-invalid-admin-password', PASSWORD_HASH_ROUNDS);

export function serializeAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

function invalidCredentials() {
  return new AppError('Sai thông tin đăng nhập.', 401, 'INVALID_CREDENTIALS');
}

export async function loginAdmin(input) {
  assertAdminAuthConfigured();
  assertAllowedFields(input, ['email', 'password']);
  const email = normalizeEmail(input.email);
  if (typeof input.password !== 'string' || !input.password) throw invalidCredentials();
  const admin = await prisma.adminAccount.findUnique({ where: { email } });
  const matches = await comparePassword(input.password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !admin.isActive || !matches) throw invalidCredentials();
  return { admin: serializeAdmin(admin), token: issueAdminToken(admin) };
}

export async function getCurrentAdmin(adminId) {
  const admin = await prisma.adminAccount.findUnique({ where: { id: adminId } });
  if (!admin?.isActive) throw new AppError('Không thể xác thực quản trị viên.', 401, 'UNAUTHORIZED');
  return serializeAdmin(admin);
}

export async function changeAdminPassword(adminId, input) {
  assertAllowedFields(input, ['currentPassword', 'newPassword', 'newPasswordConfirmation']);
  validatePasswordConfirmation(input.newPassword, input.newPasswordConfirmation, 'newPassword');
  if (typeof input.currentPassword !== 'string' || !input.currentPassword) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  const admin = await prisma.adminAccount.findUnique({ where: { id: adminId } });
  if (!admin?.isActive) throw new AppError('Không thể xác thực quản trị viên.', 401, 'UNAUTHORIZED');
  if (!await comparePassword(input.currentPassword, admin.passwordHash)) {
    throw new AppError('Không thể đổi mật khẩu.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  if (await comparePassword(input.newPassword, admin.passwordHash)) {
    throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại.', 400, 'PASSWORD_CHANGE_FAILED');
  }
  await prisma.adminAccount.update({
    where: { id: adminId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  return { changed: true };
}
