export const GUEST_CART_KEY = "sai_guest_cart";

export function getGuestCartItems() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? "[]");

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (item) =>
        item &&
        (typeof item.productVariantId === "string" ||
          (typeof item.productVariantId === "number" && Number.isSafeInteger(item.productVariantId))) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}
