const RESET_TOKEN_SESSION_KEY = 'steplab.passwordResetToken';

function defaultStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export function capturePasswordResetToken(hash, storage = defaultStorage()) {
  const token = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('token') || '';
  if (token && storage) storage.setItem(RESET_TOKEN_SESSION_KEY, token);
  return token || storage?.getItem(RESET_TOKEN_SESSION_KEY) || '';
}

export function clearCapturedPasswordResetToken(storage = defaultStorage()) {
  storage?.removeItem(RESET_TOKEN_SESSION_KEY);
}
