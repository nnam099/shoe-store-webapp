/**
 * STEP/LAB Admin Session Utilities
 * Manages Admin JWT token in localStorage (separate from Member sessionStorage).
 * Key: steplab_admin_token_v1
 */

export const ADMIN_TOKEN_KEY = 'steplab_admin_token_v1';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAdminToken() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const token = storage.getItem(ADMIN_TOKEN_KEY);
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  const storage = getStorage();
  if (!storage || typeof token !== 'string' || !token.trim()) return false;
  try {
    storage.setItem(ADMIN_TOKEN_KEY, token.trim());
    return true;
  } catch {
    return false;
  }
}

export function clearAdminToken() {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(ADMIN_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}
