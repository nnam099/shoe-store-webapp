import { getProductBySlug } from './catalogService.js';

/**
 * Hydrates stored cart rows against the single source of truth (Mock Catalog).
 * 
 * Defines clear item validity:
 * - identityValid: Product exists AND Colorway exists in Product AND Variant exists in Colorway
 * - isPurchasable: identityValid AND currentStock > 0
 * - currentUnitPrice: colorway.salePrice ?? colorway.price (only when identityValid)
 * 
 * @param {Array} storedItems - Items read from localStorage
 * @returns {Array<Object>} Hydrated cart items
 */
export function hydrateCartItems(storedItems = []) {
  if (!Array.isArray(storedItems)) return [];

  return storedItems.map((storedItem) => {
    const product = getProductBySlug(storedItem.productSlug);
    const colorway = product?.colorways.find((c) => c.slug === storedItem.colorwaySlug) || null;
    const variant = colorway?.variants.find((v) => v.size === storedItem.size) || null;

    const identityValid = Boolean(product && colorway && variant);
    const currentStock = variant ? variant.stock : 0;
    const isPurchasable = Boolean(identityValid && currentStock > 0);

    const currentUnitPrice = identityValid
      ? (colorway.salePrice ?? colorway.price)
      : (storedItem.unitPrice || 0);

    const originalPrice = identityValid ? colorway.price : null;
    const isSale = identityValid && colorway.salePrice != null && colorway.salePrice < colorway.price;

    // Quantity clamping logic:
    // If stock > 0 and stored quantity exceeds current stock -> clamp to currentStock
    // If stock = 0 -> preserve stored quantity (do not clamp to 0; minimum valid quantity is 1)
    const storedQty = Math.max(1, parseInt(storedItem.quantity, 10) || 1);
    let effectiveQuantity = storedQty;
    let wasQuantityClamped = false;

    if (identityValid && currentStock > 0 && storedQty > currentStock) {
      effectiveQuantity = currentStock;
      wasQuantityClamped = true;
    }

    const lineTotal = currentUnitPrice * effectiveQuantity;

    return {
      storedItem,
      id: storedItem.id || `${storedItem.productSlug}:${storedItem.colorwaySlug}:${storedItem.size}`,
      product,
      colorway,
      variant,
      identityValid,
      isPurchasable,
      currentStock,
      currentUnitPrice,
      originalPrice,
      isSale,
      effectiveQuantity,
      wasQuantityClamped,
      lineTotal,
    };
  });
}

/**
 * Normalizes cart items by pruning invalid identities and persisting clamped quantities.
 * Returns normalized rows for localStorage and summary of changes.
 * 
 * @param {Array<Object>} hydratedItems
 * @returns {{ normalizedCart: Array, hasChanges: boolean, prunedCount: number, clampedCount: number }}
 */
export function getNormalizedCart(hydratedItems = []) {
  let hasChanges = false;
  let prunedCount = 0;
  let clampedCount = 0;

  const normalizedCart = [];

  for (const item of hydratedItems) {
    if (!item.identityValid) {
      // Stale invalid row -> prune
      hasChanges = true;
      prunedCount++;
      continue;
    }

    if (item.wasQuantityClamped) {
      hasChanges = true;
      clampedCount++;
    }

    normalizedCart.push({
      ...item.storedItem,
      id: item.id,
      quantity: item.effectiveQuantity,
      unitPrice: item.currentUnitPrice, // Update unit price snapshot as good practice
    });
  }

  return {
    normalizedCart,
    hasChanges,
    prunedCount,
    clampedCount,
  };
}

/**
 * Calculates cart totals from hydrated items.
 * Rules:
 * - Rows with currentStock = 0 DO NOT count into purchasable subtotal.
 * - Out-of-stock items still count in totalQuantity (item pairs) until user removes them.
 */
export function calculateCartTotals(hydratedItems = []) {
  let subtotal = 0;
  let totalQuantity = 0;
  let hasOutOfStock = false;
  let purchasableItemCount = 0;

  for (const item of hydratedItems) {
    if (!item.identityValid) continue;

    totalQuantity += item.effectiveQuantity;

    if (item.currentStock === 0) {
      hasOutOfStock = true;
    } else {
      subtotal += item.lineTotal;
      purchasableItemCount += item.effectiveQuantity;
    }
  }

  return {
    subtotal,
    totalQuantity,
    hasOutOfStock,
    purchasableItemCount,
  };
}
