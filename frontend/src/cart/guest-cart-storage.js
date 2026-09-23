export const GUEST_CART_KEY = "sai_guest_cart";
export const CART_UPDATED_EVENT = "sai:cart-updated";

const MAX_QUANTITY = 2147483647;
const MAX_BIGINT_ID = 9223372036854775807n;

function isValidProductVariantId(value) {
  const normalized = String(value);
  return /^[1-9][0-9]*$/.test(normalized) && BigInt(normalized) <= MAX_BIGINT_ID;
}

function isValidQuantity(value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_QUANTITY;
}

export function notifyCartUpdated() {
  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  }
}

function writeGuestCartItems(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    notifyCartUpdated();
    return { saved: true, items };
  } catch {
    return { saved: false, reason: "storage_error" };
  }
}

export function getGuestCartItems() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? "[]");

    if (!Array.isArray(value)) {
      return [];
    }

    const quantities = new Map();
    for (const item of value) {
      if (item && isValidProductVariantId(item.productVariantId) && isValidQuantity(item.quantity)) {
        const productVariantId = String(item.productVariantId);
        const total = (quantities.get(productVariantId) ?? 0) + item.quantity;
        if (total <= MAX_QUANTITY) {
          quantities.set(productVariantId, total);
        }
      }
    }
    return [...quantities].map(([productVariantId, quantity]) => ({ productVariantId, quantity }));
  } catch {
    return [];
  }
}

export function addGuestCartItem({ productVariantId, quantity, stockQuantity }) {
  if (
    !isValidProductVariantId(productVariantId) ||
    !isValidQuantity(quantity) ||
    !Number.isInteger(stockQuantity) ||
    stockQuantity < 0
  ) {
    return { added: false, reason: "invalid" };
  }

  const normalizedId = String(productVariantId);
  const items = getGuestCartItems();
  const existing = items.find((item) => item.productVariantId === normalizedId);
  const finalQuantity = (existing?.quantity ?? 0) + quantity;

  if (finalQuantity > stockQuantity) {
    return {
      added: false,
      reason: "stock_exceeded",
      currentQuantity: existing?.quantity ?? 0,
      stockQuantity,
    };
  }

  const nextItems = existing
    ? items.map((item) =>
        item.productVariantId === normalizedId ? { ...item, quantity: finalQuantity } : item,
      )
    : [...items, { productVariantId: normalizedId, quantity }];

  const saved = writeGuestCartItems(nextItems);
  if (!saved.saved) {
    return { added: false, reason: "storage_error" };
  }

  return { added: true, quantity: finalQuantity, items: nextItems };
}

export function updateGuestCartItem({ productVariantId, quantity }) {
  if (!isValidProductVariantId(productVariantId) || !isValidQuantity(quantity)) {
    return { updated: false, reason: "invalid" };
  }

  const normalizedId = String(productVariantId);
  const items = getGuestCartItems();
  if (!items.some((item) => item.productVariantId === normalizedId)) {
    return { updated: false, reason: "not_found" };
  }

  const nextItems = items.map((item) =>
    item.productVariantId === normalizedId ? { ...item, quantity } : item,
  );
  const saved = writeGuestCartItems(nextItems);
  return saved.saved
    ? { updated: true, quantity, items: nextItems }
    : { updated: false, reason: saved.reason };
}

export function capGuestCartItem({ productVariantId, stockQuantity }) {
  return updateGuestCartItem({ productVariantId, quantity: stockQuantity });
}

export function removeGuestCartItem(productVariantId) {
  if (!isValidProductVariantId(productVariantId)) {
    return { removed: false, reason: "invalid" };
  }

  const normalizedId = String(productVariantId);
  const items = getGuestCartItems();
  const nextItems = items.filter((item) => item.productVariantId !== normalizedId);
  if (nextItems.length === items.length) {
    return { removed: true, items };
  }

  const saved = writeGuestCartItems(nextItems);
  return saved.saved
    ? { removed: true, items: nextItems }
    : { removed: false, reason: saved.reason };
}

export function clearGuestCart() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    notifyCartUpdated();
    return true;
  } catch {
    return false;
  }
}
