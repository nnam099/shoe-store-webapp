import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  isCurrentPasswordVersion,
  verifyMemberToken,
} from '../utils/memberToken.js';

function unauthorizedError() {
  return new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
}

function readBearerToken(req) {
  const authorization = req.headers?.authorization;

  if (authorization === undefined) return null;
  if (typeof authorization !== 'string') throw unauthorizedError();

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) throw unauthorizedError();
  return match[1];
}

async function authenticateToken(token) {
  let claims;

  try {
    claims = verifyMemberToken(token);
  } catch (error) {
    if (error?.code === 'AUTH_CONFIGURATION_ERROR') throw error;
    throw unauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (
    !user
    || !isCurrentPasswordVersion(claims.passwordVersion, user.passwordHash)
  ) {
    throw unauthorizedError();
  }

  return { id: user.id };
}

export async function requireMember(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) throw unauthorizedError();

    req.member = await authenticateToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Future Member Checkout foundation: missing credentials are Guest, but any
 * credentials that are present must authenticate successfully.
 */
export async function strictOptionalMember(req, res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      req.member = null;
      next();
      return;
    }

    req.member = await authenticateToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
