import 'dotenv/config';

const MEMBER_TOKEN_ISSUER = 'steplab-api';
const MEMBER_TOKEN_AUDIENCE = 'steplab-member';
const DEFAULT_MEMBER_TOKEN_EXPIRATION = '8h';
const MINIMUM_SECRET_LENGTH = 32;

function configurationError(message) {
  const error = new Error(message);
  error.code = 'AUTH_CONFIGURATION_ERROR';
  return error;
}

/**
 * Loads Member JWT configuration only when authentication is used.
 * This lets non-authenticated routes start independently while ensuring auth
 * operations fail closed when the secret is missing or unsafe.
 */
export function getMemberAuthConfig() {
  const secret = process.env.JWT_MEMBER_SECRET;
  const expiresIn = process.env.JWT_MEMBER_EXPIRES_IN?.trim()
    || DEFAULT_MEMBER_TOKEN_EXPIRATION;

  if (typeof secret !== 'string' || secret.length < MINIMUM_SECRET_LENGTH) {
    throw configurationError(
      `JWT_MEMBER_SECRET must be configured with at least ${MINIMUM_SECRET_LENGTH} characters.`
    );
  }

  if (!/^[1-9]\d*(?:ms|s|m|h|d|w|y)$/.test(expiresIn)) {
    throw configurationError('JWT_MEMBER_EXPIRES_IN has an invalid duration format.');
  }

  return {
    secret,
    expiresIn,
    issuer: MEMBER_TOKEN_ISSUER,
    audience: MEMBER_TOKEN_AUDIENCE,
  };
}
