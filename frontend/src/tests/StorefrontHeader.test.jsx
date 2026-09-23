import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "../auth/AuthProvider.jsx";
import { addGuestCartItem, GUEST_CART_KEY } from "../cart/guest-cart-storage.js";
import { StorefrontHeader } from "../components/storefront/StorefrontHeader.jsx";

describe("StorefrontHeader", () => {
  it("links to the cart and updates the Guest quantity badge", async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productVariantId: "5", quantity: 2 }]));
    render(
      <MemoryRouter>
        <AuthProvider><StorefrontHeader /></AuthProvider>
      </MemoryRouter>,
    );

    const cartLink = screen.getByRole("link", { name: /Giỏ hàng/ });
    expect(cartLink).toHaveAttribute("href", "/gio-hang");
    expect(await screen.findByLabelText("2 sản phẩm trong giỏ")).toBeInTheDocument();

    addGuestCartItem({ productVariantId: "6", quantity: 1, stockQuantity: 3 });
    expect(await screen.findByLabelText("3 sản phẩm trong giỏ")).toBeInTheDocument();

    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productVariantId: "5", quantity: 4 }]));
    globalThis.dispatchEvent(new StorageEvent("storage", { key: GUEST_CART_KEY }));
    await waitFor(() => expect(screen.getByLabelText("4 sản phẩm trong giỏ")).toBeInTheDocument());
  });
});
