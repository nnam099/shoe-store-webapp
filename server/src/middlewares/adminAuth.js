import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  isCurrentAdminPasswordVersion,
  verifyAdminToken,
} from '../utils/adminToken.js';

function unauthorized() {
  return new AppError('Không thể xác thực quản trị viên.', 401, 'UNAUTHORIZED');
}

export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers?.authorization;
    if (typeof header !== 'string') throw unauthorized();
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) throw unauthorized();

    let claims;
    try {
      claims = verifyAdminToken(match[1]);
    } catch (error) {
      if (error?.code === 'AUTH_CONFIGURATION_ERROR') throw error;
      throw unauthorized();
    }

    const admin = await prisma.adminAccount.findUnique({
      where: { id: claims.adminId },
      select: { id: true, isActive: true, passwordHash: true },
    });
    if (
      !admin?.isActive
      || !isCurrentAdminPasswordVersion(claims.passwordVersion, admin.passwordHash)
    ) throw unauthorized();

    req.admin = { id: admin.id };
    next();
  } catch (error) {
    next(error);
  }
}
