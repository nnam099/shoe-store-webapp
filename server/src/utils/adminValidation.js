import { AppError } from './errors.js';

export const ADMIN_DEFAULT_LIMIT = 20;
export const ADMIN_MAX_LIMIT = 100;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validationError(message, issues) {
  return new AppError(message, 400, 'VALIDATION_ERROR', issues);
}

export function assertAllowedFields(input, allowed, { requireOne = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Request body must be an object');
  }
  const keys = Object.keys(input);
  const unsupported = keys.filter((key) => !allowed.includes(key));
  if (unsupported.length) {
    throw validationError('Request contains unsupported fields', [{ fields: unsupported }]);
  }
  if (requireOne && keys.length === 0) throw validationError('At least one field is required');
}

export function parseId(value, field = 'id') {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw validationError(`${field} must be a positive integer`);
  }
  return Number(text);
}

export function parseBoolean(value, field, fallback = undefined) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw validationError(`${field} must be true or false`);
}

export function parsePagination(query = {}) {
  const parse = (value, fallback, field, max = null) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw validationError(`${field} must be a positive integer`);
    }
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 1 || (max && result > max)) {
      throw validationError(`${field} is outside the allowed range`);
    }
    return result;
  };
  return {
    page: parse(query.page, 1, 'page'),
    limit: parse(query.limit, ADMIN_DEFAULT_LIMIT, 'limit', ADMIN_MAX_LIMIT),
  };
}

export function parseSearch(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw validationError('q must be a string');
  const result = value.trim();
  if (result.length > 200) throw validationError('q must not exceed 200 characters');
  return result;
}

export function normalizeRequiredText(value, field, maxLength) {
  if (typeof value !== 'string') throw validationError(`${field} is required`);
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw validationError(`${field} must contain 1 to ${maxLength} characters`);
  }
  return result;
}

export function normalizeNullableText(value, field, maxLength = null) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw validationError(`${field} must be a string or null`);
  const result = value.trim();
  if (maxLength && result.length > maxLength) {
    throw validationError(`${field} must not exceed ${maxLength} characters`);
  }
  return result || null;
}

export function normalizeSlug(value, field = 'slug', maxLength = 200) {
  if (typeof value !== 'string') throw validationError(`${field} is required`);
  const result = value.trim().toLowerCase();
  if (!result || result.length > maxLength || !SLUG_PATTERN.test(result)) {
    throw validationError(`${field} must be a lowercase kebab-case value`);
  }
  return result;
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw validationError('email is required');
  const result = value.trim().toLowerCase();
  if (!result || result.length > 150 || !EMAIL_PATTERN.test(result)) {
    throw validationError('email is invalid');
  }
  return result;
}

export function parseEnum(value, allowed, field, fallback = undefined) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw validationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

export function paginationResult(page, limit, totalItems) {
  return { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
}
