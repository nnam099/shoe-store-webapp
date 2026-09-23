import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";
import { GUEST_CART_KEY } from "../cart/guest-cart-storage.js";

const product = {
  id: "10",
  name: "Sải Detail",
  slug: "sai-detail",
  description: "Một đôi giày nhẹ và êm.",
  material: "Vải dệt",
  category: { id: "1", name: "Giày chạy" },
  brand: { id: "2", name: "SẢI" },
  price: 1_200_000,
  salePrice: 990_000,
  effectivePrice: 990_000,
  badgeLabel: "featured",
  mainImage: "/uploads/a.webp",
  images: [
    { id: "20", path: "/uploads/a.webp", position: 1 },
    { id: "21", path: "/uploads/b.webp", position: 2 },
  ],
  variants: [
    { id: "30", size: { id: "40", value: "40" }, color: { id: "red", name: "Đỏ", hexCode: "#ff0000" }, stockQuantity: 3, inStock: true },
    { id: "31", size: { id: "40", value: "40" }, color: { id: "blue", name: "Xanh", hexCode: "#0000ff" }, stockQuantity: 0, inStock: false },
    { id: "32", size: { id: "41", value: "41" }, color: { id: "blue", name: "Xanh", hexCode: "#0000ff" }, stockQuantity: 2, inStock: true },
  ],
  inStock: true,
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage(fetchImplementation) {
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchImplementation);
  return render(
    <MemoryRouter initialEntries={["/san-pham/sai-detail"]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("public product detail page", () => {
  it("selects only an in-stock size-color pair and stores a Guest cart line", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => Promise.resolve(response({ product })));
    renderPage(fetchMock);

    expect(await screen.findByRole("heading", { name: "Sải Detail" })).toBeInTheDocument();
    expect(screen.queryByText("Còn 2 sản phẩm")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");

    await user.click(screen.getByRole("button", { name: "Chọn màu Xanh" }));
    expect(screen.getByRole("button", { name: "Chọn size 40" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Chọn size 41" }));
    expect(screen.getByText("Còn 2 sản phẩm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    expect(await screen.findByText("Đã thêm sản phẩm vào giỏ.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY))).toEqual([
      { productVariantId: "32", quantity: 1 },
    ]);
  });

  it("uses the authenticated Customer cart API instead of Guest storage", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACCESS_TOKEN_KEY, "customer-token");
    const fetchMock = vi.fn((url) => {
      if (url.includes("/auth/session")) {
        return Promise.resolve(response({ account: { id: "8", role: "customer", fullName: "Khách SẢI", email: "khach@example.com", phone: "0900000000" } }));
      }
      if (url.includes("/cart/items")) {
        return Promise.resolve(response({ cart: { items: [{ productVariantId: "30", quantity: 1 }] }, item: { productVariantId: "30", quantity: 1 } }));
      }
      return Promise.resolve(response({ product }));
    });
    renderPage(fetchMock);
    await screen.findByText("Khách SẢI");
    await user.click(screen.getByRole("button", { name: "Chọn màu Đỏ" }));
    await user.click(screen.getByRole("button", { name: "Chọn size 40" }));
    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("/cart/items"))).toBe(true));
    const cartCall = fetchMock.mock.calls.find(([url]) => url.includes("/cart/items"));
    expect(cartCall[1]).toMatchObject({ method: "POST" });
    expect(cartCall[1].headers.Authorization).toBe("Bearer customer-token");
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it("shows a product-specific 404 state", async () => {
    renderPage(() => Promise.resolve(response({ error: { code: "PRODUCT_NOT_FOUND", message: "Không tìm thấy sản phẩm." } }, 404)));

    expect(await screen.findByRole("heading", { name: "Không tìm thấy sản phẩm" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về danh sách sản phẩm" })).toHaveAttribute("href", "/san-pham");
  });
});
