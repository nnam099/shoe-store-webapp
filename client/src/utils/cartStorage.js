/**
 * STEP/LAB Frontend Cart Storage Foundation
 * Storage Key: steplab_cart_v1
 * Provides resilient, error-safe localStorage operations for Milestone 4.
 * Note: Frontend cart snapshot is purely for client-side experience;
 * future backend checkout MUST revalidate variants, stock, and current prices.
 */

const CART_STORAGE_KEY = 'steplab_cart_v1';

/**
 * Validates a single cart item structure.
 */
function isValidCartItem(item) {
  if (!item || typeof item !== 'object') return false;
  const { productSlug, colorwaySlug, size, quantity, unitPrice } = item;
  if (typeof productSlug !== 'string' || !productSlug.trim()) return false;
  if (typeof colorwaySlug !== 'string' || !colorwaySlug.trim()) return false;
  if (typeof size !== 'string' || !size.trim()) return false;
  if (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) return false;
  if (typeof unitPrice !== 'number' || unitPrice < 0) return false;
  return true;
}

/**
 * Safely reads and parses the cart array from localStorage.
 * Always returns an array, never throws.
 */
export function getCart() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter and sanitize rows
    return parsed.filter(isValidCartItem);
  } catch {
    // Malformed JSON or read error -> fallback to empty array safely
    return [];
  }
}

/**
 * Safely saves the cart array to localStorage.
 */
export function saveCart(cart) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const validItems = Array.isArray(cart) ? cart.filter(isValidCartItem) : [];
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItems));
    return true;
  } catch {
    return false;
  }
}

/**
 * Adds an item to cart or merges with existing variant.
 * 
 * @param {Object} item - Cart item candidate
 * @param {string} item.productSlug
 * @param {string} item.productName
 * @param {string} item.brandName
 * @param {string} item.colorwaySlug
 * @param {string} item.colorwayName
 * @param {string} item.size
 * @param {number} item.quantity
 * @param {number} item.unitPrice
 * @param {string} item.thumbnail
 * @param {number} stockLimit - Maximum stock of selected variant
 * @returns {{ cart: Array, addedItem: Object, merged: boolean }}
 */
export function addToCart(item, stockLimit = Infinity) {
  const currentCart = getCart();

  if (!item || !item.productSlug || !item.colorwaySlug || !item.size) {
    return { cart: currentCart, addedItem: null, merged: false };
  }

  const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);
  const maxAllowed = Math.max(1, stockLimit);

  // Identity key for same variant: product + colorway + size
  const existingIndex = currentCart.findIndex(
    (row) =>
      row.productSlug === item.productSlug &&
      row.colorwaySlug === item.colorwaySlug &&
      row.size === item.size
  );

  let merged = false;
  let finalAddedItem = null;

  if (existingIndex > -1) {
    // Merge quantity, capped at stockLimit
    const existing = currentCart[existingIndex];
    const newQty = Math.min(existing.quantity + requestedQty, maxAllowed);
    currentCart[existingIndex] = {
      ...existing,
      quantity: newQty,
      unitPrice: item.unitPrice, // Keep latest unit price
    };
    merged = true;
    finalAddedItem = currentCart[existingIndex];
  } else {
    // Append new row
    const newQty = Math.min(requestedQty, maxAllowed);
    finalAddedItem = {
      id: `${item.productSlug}:${item.colorwaySlug}:${item.size}`,
      productSlug: item.productSlug,
      productName: item.productName || item.productSlug,
      brandName: item.brandName || '',
      colorwaySlug: item.colorwaySlug,
      colorwayName: item.colorwayName || item.colorwaySlug,
      size: item.size,
      quantity: newQty,
      unitPrice: item.unitPrice || 0,
      thumbnail: item.thumbnail || '',
      addedAt: new Date().toISOString(),
    };
    currentCart.push(finalAddedItem);
  }

  saveCart(currentCart);
  return { cart: currentCart, addedItem: finalAddedItem, merged };
}

/**
 * Clears the cart from localStorage.
 */
export function clearCart() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
