import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, validatePasswordConfirmation } from '../utils/password.js';
import {
  assertAllowedFields,
  normalizeEmail,
  normalizeRequiredText,
  paginationResult,
  parseBoolean,
  parseEnum,
  parseId,
  parsePagination,
  parseSearch,
} from '../utils/adminValidation.js';
import { serializeAdmin } from './admin-auth.service.js';

const SORTS = ['newest', 'oldest', 'name-asc', 'name-desc', 'email-asc', 'email-desc'];

function notFound() {
  return new AppError('Không tìm thấy tài khoản quản trị.', 404, 'ADMIN_NOT_FOUND');
}
function exists() {
  return new AppError('Email quản trị đã tồn tại.', 409, 'ADMIN_ACCOUNT_EXISTS');
}

function orderBy(sort) {
  const map = {
    newest: { createdAt: 'desc' }, oldest: { createdAt: 'asc' },
    'name-asc': { fullName: 'asc' }, 'name-desc': { fullName: 'desc' },
    'email-asc': { email: 'asc' }, 'email-desc': { email: 'desc' },
  };
  return map[sort];
}

export async function listAdminAccounts(query) {
  const { page, limit } = parsePagination(query);
  const q = parseSearch(query.q);
  const isActive = parseBoolean(query.isActive, 'isActive');
  const sort = parseEnum(query.sort, SORTS, 'sort', 'newest');
  const where = {
    ...(isActive === undefined ? {} : { isActive }),
    ...(q ? { OR: [
      { email: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [items, totalItems] = await prisma.$transaction([
    prisma.adminAccount.findMany({ where, orderBy: [orderBy(sort), { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
    prisma.adminAccount.count({ where }),
  ]);
  return { items: items.map(serializeAdmin), pagination: paginationResult(page, limit, totalItems) };
}

export async function getAdminAccount(rawId) {
  const id = parseId(rawId, 'adminId');
  const admin = await prisma.adminAccount.findUnique({ where: { id } });
  if (!admin) throw notFound();
  return serializeAdmin(admin);
}

export async function createAdminAccount(input) {
  assertAllowedFields(input, ['email', 'fullName', 'password', 'passwordConfirmation', 'isActive']);
  const email = normalizeEmail(input.email);
  const fullName = normalizeRequiredText(input.fullName, 'fullName', 100);
  const isActive = parseBoolean(input.isActive, 'isActive', true);
  validatePasswordConfirmation(input.password, input.passwordConfirmation);
  try {
    const admin = await prisma.adminAccount.create({
      data: { email, fullName, isActive, passwordHash: await hashPassword(input.password) },
    });
    return serializeAdmin(admin);
  } catch (error) {
    if (error?.code === 'P2002') throw exists();
    throw error;
  }
}

async function guardedAccountMutation(action) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(action, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code === 'P2034' && attempt < 2) continue;
      if (error?.code === 'P2034') {
        throw new AppError('Tài khoản quản trị vừa thay đổi. Vui lòng thử lại.', 409, 'ADMIN_ACCOUNT_CONFLICT');
      }
      throw error;
    }
  }
  return null;
}

export async function updateAdminAccount(actorId, rawId, input) {
  const id = parseId(rawId, 'adminId');
  assertAllowedFields(input, ['email', 'fullName', 'isActive']);
  const data = {};
  if (Object.hasOwn(input, 'email')) data.email = normalizeEmail(input.email);
  if (Object.hasOwn(input, 'fullName')) data.fullName = normalizeRequiredText(input.fullName, 'fullName', 100);
  if (Object.hasOwn(input, 'isActive')) data.isActive = parseBoolean(input.isActive, 'isActive');
  try {
    return await guardedAccountMutation(async (tx) => {
      const target = await tx.adminAccount.findUnique({ where: { id } });
      if (!target) throw notFound();
      if (id === actorId && data.isActive === false) {
        throw new AppError('Không thể tự vô hiệu hóa tài khoản đang đăng nhập.', 409, 'SELF_MANAGEMENT_NOT_ALLOWED');
      }
      if (target.isActive && data.isActive === false) {
        const activeCount = await tx.adminAccount.count({ where: { isActive: true } });
        if (activeCount <= 1) throw new AppError('Phải giữ ít nhất một Admin hoạt động.', 409, 'LAST_ACTIVE_ADMIN');
      }
      return serializeAdmin(await tx.adminAccount.update({ where: { id }, data }));
    });
  } catch (error) {
    if (error?.code === 'P2002') throw exists();
    throw error;
  }
}

export async function resetAdminPassword(actorId, rawId, input) {
  const id = parseId(rawId, 'adminId');
  if (id === actorId) {
    throw new AppError('Hãy dùng chức năng đổi mật khẩu và xác nhận mật khẩu hiện tại.', 409, 'SELF_MANAGEMENT_NOT_ALLOWED');
  }
  assertAllowedFields(input, ['newPassword', 'newPasswordConfirmation']);
  validatePasswordConfirmation(input.newPassword, input.newPasswordConfirmation, 'newPassword');
  const existing = await prisma.adminAccount.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.adminAccount.update({ where: { id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return { changed: true };
}

export async function deleteAdminAccount(actorId, rawId) {
  const id = parseId(rawId, 'adminId');
  if (id === actorId) throw new AppError('Không thể tự xóa tài khoản đang đăng nhập.', 409, 'SELF_MANAGEMENT_NOT_ALLOWED');
  return guardedAccountMutation(async (tx) => {
    const target = await tx.adminAccount.findUnique({ where: { id } });
    if (!target) throw notFound();
    if (target.isActive) {
      const activeCount = await tx.adminAccount.count({ where: { isActive: true } });
      if (activeCount <= 1) throw new AppError('Phải giữ ít nhất một Admin hoạt động.', 409, 'LAST_ACTIVE_ADMIN');
    }
    await tx.adminAccount.delete({ where: { id } });
    return { deleted: true, id };
  });
}
