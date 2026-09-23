import { describe, expect, it, vi } from "vitest";

import {
  addGuestCartItem,
  getGuestCartItems,
  GUEST_CART_KEY,
} from "../cart/guest-cart-storage.js";

describe("guest cart storage", () => {
  it("stores one line per variant and persists the accumulated quantity", () => {
    expect(addGuestCartItem({ productVariantId: "12", quantity: 1, stockQuantity: 4 })).toMatchObject({
      added: true,
      quantity: 1,
    });
    expect(addGuestCartItem({ productVariantId: 12, quantity: 2, stockQuantity: 4 })).toMatchObject({
      added: true,
      quantity: 3,
    });
    expect(getGuestCartItems()).toEqual([{ productVariantId: "12", quantity: 3 }]);
  });

  it("does not write when the accumulated quantity exceeds stock", () => {
    addGuestCartItem({ productVariantId: "7", quantity: 2, stockQuantity: 3 });
    const result = addGuestCartItem({ productVariantId: "7", quantity: 2, stockQuantity: 3 });

    expect(result).toMatchObject({
      added: false,
      reason: "stock_exceeded",
      currentQuantity: 2,
      stockQuantity: 3,
    });
    expect(getGuestCartItems()).toEqual([{ productVariantId: "7", quantity: 2 }]);
  });

  it("recovers from malformed data and reports storage failures", () => {
    localStorage.setItem(GUEST_CART_KEY, "not-json");
    expect(getGuestCartItems()).toEqual([]);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(addGuestCartItem({ productVariantId: "9", quantity: 1, stockQuantity: 2 })).toEqual({
      added: false,
      reason: "storage_error",
    });
  });
});
