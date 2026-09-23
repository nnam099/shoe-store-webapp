export const GUEST_CART_KEY = "sai_guest_cart";

export function getGuestCartItems() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? "[]");

    if (!Array.isArray(value)) {
      return [];
    }

    const quantities = new Map();
    for (const item of value) {
      if (
        item &&
        (typeof item.productVariantId === "string" ||
          (typeof item.productVariantId === "number" && Number.isSafeInteger(item.productVariantId))) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      ) {
        const productVariantId = String(item.productVariantId);
        quantities.set(productVariantId, (quantities.get(productVariantId) ?? 0) + item.quantity);
      }
    }
    return [...quantities].map(([productVariantId, quantity]) => ({ productVariantId, quantity }));
  } catch {
    return [];
  }
}

export function addGuestCartItem({ productVariantId, quantity, stockQuantity }) {
  if (
    !/^[1-9][0-9]*$/.test(String(productVariantId)) ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
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

  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
  } catch {
    return { added: false, reason: "storage_error" };
  }

  return { added: true, quantity: finalQuantity, items: nextItems };
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}
