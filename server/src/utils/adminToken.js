import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getAdminAuthConfig } from '../config/adminAuth.js';

const ADMIN_TOKEN_TYPE = 'admin';
const PASSWORD_VERSION_LENGTH = 32;

export function assertAdminAuthConfigured() {
  getAdminAuthConfig();
}

export function deriveAdminPasswordVersion(passwordHash) {
  if (typeof passwordHash !== 'string' || !passwordHash) {
    throw new Error('An Admin password hash is required.');
  }
  const { secret } = getAdminAuthConfig();
  return createHmac('sha256', secret)
    .update('steplab-admin-password-version:v1\0')
    .update(passwordHash)
    .digest('base64url')
    .slice(0, PASSWORD_VERSION_LENGTH);
}

export function issueAdminToken(admin) {
  const { secret, expiresIn, issuer, audience } = getAdminAuthConfig();
  const subject = String(admin?.id ?? '');
  if (!/^[1-9]\d*$/.test(subject) || !admin?.passwordHash) {
    throw new Error('A valid Admin identity and password hash are required.');
  }
  return jwt.sign(
    { type: ADMIN_TOKEN_TYPE, pv: deriveAdminPasswordVersion(admin.passwordHash) },
    secret,
    { algorithm: 'HS256', subject, issuer, audience, expiresIn }
  );
}

export function verifyAdminToken(token) {
  const { secret, issuer, audience } = getAdminAuthConfig();
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer,
    audience,
  });
  if (
    !payload || typeof payload !== 'object'
    || payload.type !== ADMIN_TOKEN_TYPE
    || typeof payload.sub !== 'string'
    || !/^[1-9]\d*$/.test(payload.sub)
    || !Number.isSafeInteger(Number(payload.sub))
    || typeof payload.pv !== 'string'
    || payload.pv.length !== PASSWORD_VERSION_LENGTH
  ) {
    throw new jwt.JsonWebTokenError('Invalid Admin token claims.');
  }
  return { adminId: Number(payload.sub), passwordVersion: payload.pv };
}

export function isCurrentAdminPasswordVersion(tokenVersion, passwordHash) {
  if (typeof tokenVersion !== 'string') return false;
  const current = deriveAdminPasswordVersion(passwordHash);
  const suppliedBuffer = Buffer.from(tokenVersion, 'utf8');
  const currentBuffer = Buffer.from(current, 'utf8');
  return suppliedBuffer.length === currentBuffer.length
    && timingSafeEqual(suppliedBuffer, currentBuffer);
}
