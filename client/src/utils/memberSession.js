export const MEMBER_TOKEN_STORAGE_KEY = 'steplab_member_token_v1';

function getSessionStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getMemberToken() {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const token = storage.getItem(MEMBER_TOKEN_STORAGE_KEY);
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setMemberToken(token) {
  const storage = getSessionStorage();
  if (!storage || typeof token !== 'string' || !token.trim()) return false;

  try {
    storage.setItem(MEMBER_TOKEN_STORAGE_KEY, token.trim());
    return true;
  } catch {
    return false;
  }
}

export function clearMemberToken() {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.removeItem(MEMBER_TOKEN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
