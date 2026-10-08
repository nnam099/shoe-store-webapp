/**
 * STEP/LAB Frontend Cart Storage Foundation
 * Storage Key: steplab_cart_v1
 * Provides resilient, error-safe localStorage operations.
 * Note: Frontend cart snapshot is purely for client-side experience;
 * future backend checkout MUST revalidate variants, stock, and current prices.
 */

export const CART_STORAGE_KEY = 'steplab_cart_v1';
export const CART_UPDATED_EVENT = 'steplab:cart-updated';

/**
 * Dispatches custom event in current window/tab when cart mutates.
 */
function dispatchCartUpdated() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    } catch {
      // ignore
    }
  }
}

/**
 * Validates a single cart item structure.
 */
export function isValidCartItem(item) {
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
 * Calculates total pairs of shoes in cart (sum of quantities).
 * 
 * @param {Array|null} cart - Optional cart array, falls back to getCart()
 * @returns {number}
 */
export function getCartCount(cart = null) {
  const items = Array.isArray(cart) ? cart : getCart();
  return items.reduce((total, item) => {
    const qty = parseInt(item.quantity, 10);
    return total + (Number.isInteger(qty) && qty > 0 ? qty : 0);
  }, 0);
}

/**
 * Safely saves the cart array to localStorage and dispatches update event.
 * 
 * @param {Array} cart - Cart items to store
 * @param {boolean} shouldDispatch - Whether to dispatch steplab:cart-updated
 * @returns {boolean}
 */
export function saveCart(cart, shouldDispatch = true) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const validItems = Array.isArray(cart) ? cart.filter(isValidCartItem) : [];
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItems));
    if (shouldDispatch) {
      dispatchCartUpdated();
    }
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

  saveCart(currentCart); // Automatically dispatches steplab:cart-updated
  return { cart: currentCart, addedItem: finalAddedItem, merged };
}

/**
 * Updates the quantity of a specific cart item.
 * 
 * @param {string} itemId - id or composite key (productSlug:colorwaySlug:size)
 * @param {number} newQuantity
 * @param {number} stockLimit
 * @returns {Array} Updated cart
 */
export function updateCartItemQuantity(itemId, newQuantity, stockLimit = Infinity) {
  const currentCart = getCart();
  const index = currentCart.findIndex(
    (row) => row.id === itemId || `${row.productSlug}:${row.colorwaySlug}:${row.size}` === itemId
  );

  if (index === -1) return currentCart;

  const validStock = Math.max(1, stockLimit);
  const safeQty = Math.max(1, Math.min(parseInt(newQuantity, 10) || 1, validStock));

  currentCart[index] = {
    ...currentCart[index],
    quantity: safeQty,
  };

  saveCart(currentCart);
  return currentCart;
}

/**
 * Removes a specific item from the cart.
 * 
 * @param {string} itemId - id or composite key
 * @returns {Array} Updated cart
 */
export function removeCartItem(itemId) {
  const currentCart = getCart();
  const filteredCart = currentCart.filter(
    (row) => row.id !== itemId && `${row.productSlug}:${row.colorwaySlug}:${row.size}` !== itemId
  );

  if (filteredCart.length !== currentCart.length) {
    saveCart(filteredCart);
  }

  return filteredCart;
}

/**
 * Clears the cart from localStorage and dispatches update event.
 */
export function clearCart() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      dispatchCartUpdated();
    } catch {
      // ignore
    }
  }
}
