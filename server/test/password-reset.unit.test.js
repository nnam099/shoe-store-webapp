import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPasswordResetEmail } from '../src/email/templates.js';
import { buildPasswordResetUrl } from '../src/utils/passwordResetUrl.js';
import {
  capturePasswordResetToken,
  clearCapturedPasswordResetToken,
} from '../../client/src/utils/passwordResetToken.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('password-reset email link carries a frontend-readable token across a reload', () => {
  const rawToken = 'url-safe_reset-token-123';
  const resetUrl = buildPasswordResetUrl('http://localhost:5173/', rawToken);
  const parsed = new URL(resetUrl);
  const rendered = renderPasswordResetEmail({ resetUrl });
  const storage = memoryStorage();

  assert.equal(parsed.origin, 'http://localhost:5173');
  assert.equal(parsed.pathname, '/reset-password');
  assert.equal(parsed.search, '');
  assert.equal(capturePasswordResetToken(parsed.hash, storage), rawToken);
  assert.equal(capturePasswordResetToken('', storage), rawToken);
  assert.match(rendered.text, new RegExp(resetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(rendered.html, /href="http:\/\/localhost:5173\/reset-password#token=/);

  clearCapturedPasswordResetToken(storage);
  assert.equal(capturePasswordResetToken('', storage), '');
});
