import bcrypt from 'bcryptjs';
import { AppError } from './errors.js';

export const PASSWORD_HASH_ROUNDS = 12;
const MINIMUM_PASSWORD_LENGTH = 8;
const MAXIMUM_PASSWORD_BYTES = 72;

/**
 * Validates a password without imposing business-unapproved composition rules.
 * The byte limit prevents silent bcrypt truncation.
 */
export function validatePassword(password, fieldName = 'password') {
  if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new AppError(
      `${fieldName} must contain at least ${MINIMUM_PASSWORD_LENGTH} characters`,
      400,
      'VALIDATION_ERROR'
    );
  }

  if (Buffer.byteLength(password, 'utf8') > MAXIMUM_PASSWORD_BYTES) {
    throw new AppError(
      `${fieldName} must not exceed ${MAXIMUM_PASSWORD_BYTES} UTF-8 bytes`,
      400,
      'VALIDATION_ERROR'
    );
  }

  return password;
}

export function validatePasswordConfirmation(password, confirmation, fieldName = 'password') {
  validatePassword(password, fieldName);

  if (typeof confirmation !== 'string' || password !== confirmation) {
    throw new AppError('Password confirmation does not match', 400, 'VALIDATION_ERROR');
  }
}

export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function comparePassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, passwordHash);
}
