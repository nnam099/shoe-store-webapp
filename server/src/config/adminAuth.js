import 'dotenv/config';

const ADMIN_TOKEN_ISSUER = 'steplab-api';
const ADMIN_TOKEN_AUDIENCE = 'steplab-admin';
const DEFAULT_ADMIN_TOKEN_EXPIRATION = '8h';
const MINIMUM_SECRET_LENGTH = 32;

function configurationError(message) {
  const error = new Error(message);
  error.code = 'AUTH_CONFIGURATION_ERROR';
  return error;
}

export function getAdminAuthConfig() {
  const secret = process.env.JWT_ADMIN_SECRET;
  const expiresIn = process.env.JWT_ADMIN_EXPIRES_IN?.trim()
    || DEFAULT_ADMIN_TOKEN_EXPIRATION;

  if (typeof secret !== 'string' || secret.length < MINIMUM_SECRET_LENGTH) {
    throw configurationError(
      `JWT_ADMIN_SECRET must be configured with at least ${MINIMUM_SECRET_LENGTH} characters.`
    );
  }
  if (!/^[1-9]\d*(?:ms|s|m|h|d|w|y)$/.test(expiresIn)) {
    throw configurationError('JWT_ADMIN_EXPIRES_IN has an invalid duration format.');
  }

  return {
    secret,
    expiresIn,
    issuer: ADMIN_TOKEN_ISSUER,
    audience: ADMIN_TOKEN_AUDIENCE,
  };
}
