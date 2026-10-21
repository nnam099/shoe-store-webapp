import { fetchCatalogProduct } from './catalogService.js';

/**
 * Creates optimistic initial hydrated cart rows directly from localStorage snapshot.
 * Ensures instant UI rendering before async revalidation completes.
 *
 * @param {Array} storedItems - Rows read from localStorage
 * @returns {Array<Object>}
 */
export function createInitialHydratedItems(storedItems = []) {
  if (!Array.isArray(storedItems)) return [];

  return storedItems.map((storedItem) => {
    const quantity = Math.max(1, parseInt(storedItem.quantity, 10) || 1);
    const unitPrice = typeof storedItem.unitPrice === 'number' && storedItem.unitPrice >= 0
      ? storedItem.unitPrice
      : 0;

    return {
      id: storedItem.id || `${storedItem.productSlug}:${storedItem.colorwaySlug}:${storedItem.size}`,
      storedItem,
      product: null,
      colorway: null,
      variant: null,
      identityValid: true, // optimistically assumed until verified
      isVerified: false,
      isUnavailable: false,
      isOutOfStock: false,
      isExceedingStock: false,
      isPriceChanged: false,
      previousPrice: unitPrice,
      isPurchasable: true,
      currentStock: null,
      currentUnitPrice: unitPrice,
      originalPrice: unitPrice,
      isSale: false,
      effectiveQuantity: quantity,
      lineTotal: unitPrice * quantity,
    };
  });
}

/**
 * Revalidates stored cart items asynchronously against live Catalog API data.
 * Does NOT mutate or delete stored cart items automatically.
 *
 * @param {Array} storedItems - Items from localStorage
 * @returns {Promise<{ hydratedItems: Array<Object>, summary: Object }>}
 */
export async function revalidateCartItems(storedItems = []) {
  if (!Array.isArray(storedItems) || storedItems.length === 0) {
    return {
      hydratedItems: [],
      summary: {
        priceChanges: [],
        exceedingItems: [],
        outOfStockItems: [],
        unavailableItems: [],
        networkFailed: false,
      },
    };
  }

  // 1. Deduplicate unique product slugs
  const uniqueSlugs = [...new Set(storedItems.map((item) => item.productSlug).filter(Boolean))];

  // 2. Fetch live product data for each slug in parallel
  const productMap = new Map();
  let networkFailed = false;

  await Promise.allSettled(
    uniqueSlugs.map(async (slug) => {
      try {
        const product = await fetchCatalogProduct(slug);
        productMap.set(slug, { status: 'found', product });
      } catch (err) {
        if (err?.status === 404 || err?.code === 'PRODUCT_NOT_FOUND') {
          productMap.set(slug, { status: 'not_found', product: null });
        } else {
          // Network or server error
          networkFailed = true;
          productMap.set(slug, { status: 'error', error: err });
        }
      }
    })
  );

  const priceChanges = [];
  const exceedingItems = [];
  const outOfStockItems = [];
  const unavailableItems = [];

  // 3. Hydrate and validate each cart row
  const hydratedItems = storedItems.map((storedItem) => {
    const slug = storedItem.productSlug;
    const lookup = productMap.get(slug);

    const storedQty = Math.max(1, parseInt(storedItem.quantity, 10) || 1);
    const storedPrice = typeof storedItem.unitPrice === 'number' && storedItem.unitPrice >= 0
      ? storedItem.unitPrice
      : 0;

    const baseRow = {
      id: storedItem.id || `${storedItem.productSlug}:${storedItem.colorwaySlug}:${storedItem.size}`,
      storedItem,
      product: null,
      colorway: null,
      variant: null,
      isVerified: false,
      identityValid: true,
      isUnavailable: false,
      isOutOfStock: false,
      isExceedingStock: false,
      isPriceChanged: false,
      previousPrice: storedPrice,
      isPurchasable: false,
      currentStock: null,
      currentUnitPrice: storedPrice,
      originalPrice: storedPrice,
      isSale: false,
      effectiveQuantity: storedQty,
      lineTotal: storedPrice * storedQty,
    };

    // If fetch failed due to network error: preserve snapshot with unverified flag
    if (!lookup || lookup.status === 'error') {
      return {
        ...baseRow,
        isVerified: false,
        isPurchasable: false, // unverified items cannot be confirmed for checkout until connected
      };
    }

    // If product was deleted or inactive (404)
    if (lookup.status === 'not_found' || !lookup.product) {
      unavailableItems.push(storedItem);
      return {
        ...baseRow,
        isVerified: true,
        identityValid: false,
        isUnavailable: true,
        isPurchasable: false,
      };
    }

    const product = lookup.product;
    const colorway = product.colorways?.find((cw) => cw.slug === storedItem.colorwaySlug) || null;
    const variant = colorway?.variants?.find((v) => v.size === storedItem.size) || null;

    // If colorway or variant not found in active product
    if (!colorway || !variant) {
      unavailableItems.push(storedItem);
      return {
        ...baseRow,
        product,
        colorway,
        isVerified: true,
        identityValid: false,
        isUnavailable: true,
        isPurchasable: false,
      };
    }

    // Variant found and verified!
    const currentStock = Number.isInteger(variant.stock) ? Math.max(0, variant.stock) : 0;
    const liveUnitPrice = colorway.salePrice ?? colorway.price ?? storedPrice;
    const isPriceChanged = storedPrice !== liveUnitPrice;
    const isOutOfStock = currentStock === 0;
    const isExceedingStock = !isOutOfStock && storedQty > currentStock;

    if (isPriceChanged) {
      priceChanges.push({ storedItem, previousPrice: storedPrice, newPrice: liveUnitPrice });
    }
    if (isOutOfStock) {
      outOfStockItems.push(storedItem);
    } else if (isExceedingStock) {
      exceedingItems.push({ storedItem, availableStock: currentStock });
    }

    const isPurchasable = !isOutOfStock && !isExceedingStock;
    const lineTotal = liveUnitPrice * storedQty;

    return {
      ...baseRow,
      product,
      colorway,
      variant,
      isVerified: true,
      identityValid: true,
      isUnavailable: false,
      isOutOfStock,
      isExceedingStock,
      isPriceChanged,
      previousPrice: storedPrice,
      isPurchasable,
      currentStock,
      currentUnitPrice: liveUnitPrice,
      originalPrice: colorway.price,
      isSale: colorway.salePrice != null && colorway.salePrice < colorway.price,
      effectiveQuantity: storedQty, // Preserved! Does NOT silently clamp stored quantity
      lineTotal,
    };
  });

  return {
    hydratedItems,
    summary: {
      priceChanges,
      exceedingItems,
      outOfStockItems,
      unavailableItems,
      networkFailed,
    },
  };
}

/**
 * Calculates order totals from hydrated items.
 * Rules:
 * - Only items that are confirmed `isPurchasable: true` count into subtotal.
 * - Out-of-stock, unavailable or exceeding-stock items prevent invalid checkout.
 */
export function calculateCartTotals(hydratedItems = []) {
  let subtotal = 0;
  let totalQuantity = 0;
  let purchasableItemCount = 0;
  let hasOutOfStock = false;
  let hasUnavailable = false;
  let hasExceedingStock = false;
  let hasUnverified = false;

  for (const item of hydratedItems) {
    totalQuantity += item.effectiveQuantity;

    if (!item.isVerified) {
      hasUnverified = true;
    }

    if (item.isUnavailable) {
      hasUnavailable = true;
    } else if (item.isOutOfStock) {
      hasOutOfStock = true;
    } else if (item.isExceedingStock) {
      hasExceedingStock = true;
    }

    if (item.isPurchasable) {
      subtotal += item.lineTotal;
      purchasableItemCount += item.effectiveQuantity;
    }
  }

  const hasIssues = hasOutOfStock || hasUnavailable || hasExceedingStock;

  return {
    subtotal,
    totalQuantity,
    purchasableItemCount,
    hasIssues,
    hasOutOfStock,
    hasUnavailable,
    hasExceedingStock,
    hasUnverified,
  };
}
