import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getMemberAuthConfig } from '../config/memberAuth.js';

const MEMBER_TOKEN_TYPE = 'member';
const PASSWORD_VERSION_LENGTH = 32;

export function assertMemberAuthConfigured() {
  getMemberAuthConfig();
}

/**
 * Derives a non-sensitive password-version fingerprint. Changing passwordHash
 * changes this value and immediately invalidates every previously issued token.
 */
export function derivePasswordVersion(passwordHash) {
  if (typeof passwordHash !== 'string' || !passwordHash) {
    throw new Error('A password hash is required to derive a password version.');
  }

  const { secret } = getMemberAuthConfig();
  return createHmac('sha256', secret)
    .update('steplab-member-password-version:v1\0')
    .update(passwordHash)
    .digest('base64url')
    .slice(0, PASSWORD_VERSION_LENGTH);
}

export function issueMemberToken(user) {
  const { secret, expiresIn, issuer, audience } = getMemberAuthConfig();
  const subject = String(user?.id ?? '');

  if (!/^\d+$/.test(subject) || !Number.isInteger(user?.authVersion) || user.authVersion < 1) {
    throw new Error('A valid User identity and auth version are required to issue a token.');
  }

  return jwt.sign(
    {
      type: MEMBER_TOKEN_TYPE,
      av: user.authVersion,
      ...(user.passwordHash ? { pv: derivePasswordVersion(user.passwordHash) } : {}),
    },
    secret,
    {
      algorithm: 'HS256',
      subject,
      issuer,
      audience,
      expiresIn,
    }
  );
}

export function verifyMemberToken(token) {
  const { secret, issuer, audience } = getMemberAuthConfig();
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer,
    audience,
  });

  if (
    !payload
    || typeof payload !== 'object'
    || payload.type !== MEMBER_TOKEN_TYPE
    || typeof payload.sub !== 'string'
    || !/^[1-9]\d*$/.test(payload.sub)
    || !Number.isSafeInteger(Number(payload.sub))
    || !(
      (Number.isInteger(payload.av) && payload.av >= 1)
      || (typeof payload.pv === 'string' && payload.pv.length === PASSWORD_VERSION_LENGTH)
    )
  ) {
    throw new jwt.JsonWebTokenError('Invalid Member token claims.');
  }

  return {
    userId: Number(payload.sub),
    authVersion: Number.isInteger(payload.av) ? payload.av : null,
    passwordVersion: typeof payload.pv === 'string' ? payload.pv : null,
  };
}

export function isCurrentPasswordVersion(tokenVersion, passwordHash) {
  if (typeof tokenVersion !== 'string' || typeof passwordHash !== 'string') return false;

  const currentVersion = derivePasswordVersion(passwordHash);
  const tokenBuffer = Buffer.from(tokenVersion, 'utf8');
  const currentBuffer = Buffer.from(currentVersion, 'utf8');

  return tokenBuffer.length === currentBuffer.length
    && timingSafeEqual(tokenBuffer, currentBuffer);
}
