import { describe, expect, it, vi } from "vitest";

import {
  addGuestCartItem,
  capGuestCartItem,
  CART_UPDATED_EVENT,
  getGuestCartItems,
  GUEST_CART_KEY,
  removeGuestCartItem,
  updateGuestCartItem,
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

  it("updates, caps and removes one persisted variant", () => {
    addGuestCartItem({ productVariantId: "15", quantity: 3, stockQuantity: 8 });
    addGuestCartItem({ productVariantId: "16", quantity: 1, stockQuantity: 8 });

    expect(updateGuestCartItem({ productVariantId: "15", quantity: 5 })).toMatchObject({
      updated: true,
      quantity: 5,
    });
    expect(capGuestCartItem({ productVariantId: "15", stockQuantity: 2 })).toMatchObject({
      updated: true,
      quantity: 2,
    });
    expect(removeGuestCartItem("16")).toMatchObject({ removed: true });
    expect(removeGuestCartItem("16")).toMatchObject({ removed: true });
    expect(getGuestCartItems()).toEqual([{ productVariantId: "15", quantity: 2 }]);
  });

  it("rejects invalid updates and keeps only the approved local shape", () => {
    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify([
        { productVariantId: "21", quantity: 2, unitPrice: 1000, name: "Không lưu" },
        { productVariantId: "invalid", quantity: 1 },
        { productVariantId: "22", quantity: 0 },
      ]),
    );

    expect(getGuestCartItems()).toEqual([{ productVariantId: "21", quantity: 2 }]);
    expect(updateGuestCartItem({ productVariantId: "21", quantity: 0 })).toEqual({
      updated: false,
      reason: "invalid",
    });
    expect(updateGuestCartItem({ productVariantId: "999", quantity: 1 })).toEqual({
      updated: false,
      reason: "not_found",
    });
  });

  it("emits a cart update event after successful writes", () => {
    const listener = vi.fn();
    globalThis.addEventListener(CART_UPDATED_EVENT, listener);

    addGuestCartItem({ productVariantId: "31", quantity: 1, stockQuantity: 3 });
    updateGuestCartItem({ productVariantId: "31", quantity: 2 });
    removeGuestCartItem("31");

    expect(listener).toHaveBeenCalledTimes(3);
    globalThis.removeEventListener(CART_UPDATED_EVENT, listener);
  });
});
