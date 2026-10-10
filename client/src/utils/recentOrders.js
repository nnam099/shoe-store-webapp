/**
 * Browser-local Guest order shortcuts.
 * Stores only an order code and the local time at which a successful checkout
 * was recorded. The timestamp is not the authoritative database Order.createdAt.
 */

export const RECENT_ORDERS_STORAGE_KEY = 'steplab_recent_orders_v1';
export const RECENT_ORDERS_MAX_ITEMS = 5;
export const RECENT_ORDERS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeOrderCode(orderCode) {
  if (typeof orderCode !== 'string') return null;

  const normalized = orderCode.trim().toUpperCase();
  if (!normalized || normalized.length > 50) return null;
  return normalized;
}

function normalizeCreatedAt(createdAt) {
  if (typeof createdAt !== 'string' || !createdAt.trim()) return null;

  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function resolveNow(now) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

/**
 * Sanitizes, de-duplicates, sorts, expires, and limits recent order shortcuts.
 * This function is pure and accepts an optional clock for deterministic tests.
 */
export function pruneRecentOrders(entries, now = Date.now()) {
  if (!Array.isArray(entries)) return [];

  const currentTime = resolveNow(now);
  const cutoff = currentTime - RECENT_ORDERS_MAX_AGE_MS;
  const newestByCode = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const orderCode = normalizeOrderCode(entry.orderCode);
    const createdAt = normalizeCreatedAt(entry.createdAt);
    if (!orderCode || !createdAt) continue;

    const createdTime = Date.parse(createdAt);
    if (createdTime < cutoff) continue;

    const existing = newestByCode.get(orderCode);
    if (!existing || createdTime > Date.parse(existing.createdAt)) {
      newestByCode.set(orderCode, { orderCode, createdAt });
    }
  }

  return [...newestByCode.values()]
    .sort((left, right) => {
      const timeDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return timeDifference || left.orderCode.localeCompare(right.orderCode);
    })
    .slice(0, RECENT_ORDERS_MAX_ITEMS);
}

/**
 * Reads and self-heals recent order storage. Always returns an array.
 */
export function getRecentOrders(now = Date.now()) {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(RECENT_ORDERS_STORAGE_KEY);
    if (!raw) return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }

    const recentOrders = pruneRecentOrders(parsed, now);
    const serialized = JSON.stringify(recentOrders);

    if (serialized !== raw) {
      try {
        storage.setItem(RECENT_ORDERS_STORAGE_KEY, serialized);
      } catch {
        // A read remains usable even if storage is unavailable or over quota.
      }
    }

    return recentOrders;
  } catch {
    return [];
  }
}

/**
 * Adds a successful Guest order shortcut without ever throwing to Checkout.
 */
export function addRecentOrder(
  orderCode,
  createdAt = new Date().toISOString(),
  now = Date.now()
) {
  try {
    const normalizedCode = normalizeOrderCode(orderCode);
    const normalizedCreatedAt = normalizeCreatedAt(createdAt);
    if (!normalizedCode || !normalizedCreatedAt) return getRecentOrders(now);

    const existing = getRecentOrders(now).filter(
      (entry) => entry.orderCode !== normalizedCode
    );
    const recentOrders = pruneRecentOrders(
      [{ orderCode: normalizedCode, createdAt: normalizedCreatedAt }, ...existing],
      now
    );

    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(recentOrders));
      } catch {
        // Recording a shortcut must never turn a successful order into a failure.
      }
    }

    return recentOrders;
  } catch {
    return [];
  }
}
