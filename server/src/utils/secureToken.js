import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export function createOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString('base64url');
}

export function hashOpaqueToken(token) {
  if (typeof token !== 'string' || !token) return null;
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createSixDigitCode() {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return String(value).padStart(6, '0');
}

export function hmacSecret(value, secret, namespace) {
  if (typeof value !== 'string' || !value || typeof secret !== 'string' || !secret) {
    throw new Error('A value and secret are required for HMAC.');
  }
  return createHmac('sha256', secret)
    .update(`${namespace}\0`, 'utf8')
    .update(value, 'utf8')
    .digest('hex');
}

export function constantTimeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}
