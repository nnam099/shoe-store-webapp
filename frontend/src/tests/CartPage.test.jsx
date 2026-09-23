import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";
import { GUEST_CART_KEY } from "../cart/guest-cart-storage.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cartItem({ id = "11", quantity = 2, stockQuantity = 5, status = "available" } = {}) {
  const unitPrice = 800_000;
  return {
    productVariantId: id,
    quantity,
    product: {
      id: "1",
      name: id === "11" ? "Sải Cart" : "Sải Limited",
      slug: id === "11" ? "sai-cart" : "sai-limited",
      mainImage: "/uploads/cart.webp",
    },
    variant: {
      size: { id: "40", value: "40" },
      color: { id: "blue", name: "Xanh", hexCode: "#0000ff" },
    },
    unitPrice,
    lineTotal: unitPrice * quantity,
    stockQuantity,
    status,
    message: status === "insufficient_stock" ? `Biến thể này chỉ còn ${stockQuantity} sản phẩm.` : null,
  };
}

function cartFromItems(items) {
  return {
    items,
    subtotal: items.reduce(
      (total, item) => total + (item.status === "available" ? item.lineTotal : 0),
      0,
    ),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    hasUnavailableItems: items.some((item) => item.status !== "available"),
  };
}

function renderCart(fetchImplementation) {
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchImplementation);
  return render(
    <MemoryRouter initialEntries={["/gio-hang"]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("CartPage", () => {
  it("validates and displays the Guest cart with current prices and stale lines", async () => {
    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify([
        { productVariantId: "11", quantity: 2 },
        { productVariantId: "12", quantity: 4 },
      ]),
    );
    const cart = cartFromItems([
      cartItem(),
      cartItem({ id: "12", quantity: 4, stockQuantity: 2, status: "insufficient_stock" }),
    ]);
    const fetchMock = vi.fn(() => Promise.resolve(response({ cart })));
    renderCart(fetchMock);

    expect(await screen.findByRole("heading", { name: "Những đôi giày bạn đã chọn" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Sải Cart" })).toHaveAttribute("href", "/san-pham/sai-cart");
    expect(screen.getByText("Không còn khả dụng")).toBeInTheDocument();
    expect(screen.getByText("Biến thể này chỉ còn 2 sản phẩm.")).toBeInTheDocument();
    expect(screen.getAllByText(/1.600.000/)).toHaveLength(2);
    expect(screen.queryByText(/đặt hàng/i)).not.toBeInTheDocument();
    expect(document.title).toBe("Giỏ hàng | SẢI");

    const validateCall = fetchMock.mock.calls.find(([url]) => url.includes("/cart/validate"));
    expect(validateCall[1].headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(validateCall[1].body)).toEqual({
      items: [
        { productVariantId: "11", quantity: 2 },
        { productVariantId: "12", quantity: 4 },
      ],
    });
  });

  it("caps and removes a Guest line after confirmation", async () => {
    const user = userEvent.setup();
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productVariantId: "12", quantity: 4 }]));
    const fetchMock = vi.fn((_url, options) => {
      const items = JSON.parse(options.body).items;
      const mapped = items.map((item) =>
        cartItem({
          id: item.productVariantId,
          quantity: item.quantity,
          stockQuantity: 2,
          status: item.quantity > 2 ? "insufficient_stock" : "available",
        }),
      );
      return Promise.resolve(response({ cart: cartFromItems(mapped) }));
    });
    renderCart(fetchMock);

    const quantityInput = await screen.findByRole("spinbutton", { name: "Số lượng Sải Limited" });
    await user.clear(quantityInput);
    await user.type(quantityInput, "9");
    await user.click(screen.getByRole("button", { name: "Cập nhật" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY))).toEqual([
      { productVariantId: "12", quantity: 4 },
    ]);

    await user.click(await screen.findByRole("button", { name: "Cập nhật về 2" }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY))).toEqual([
        { productVariantId: "12", quantity: 2 },
      ]);
    });
    expect(await screen.findByText("Còn hàng")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xóa dòng" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Không xóa" }));
    expect(screen.getByRole("link", { name: "Sải Limited" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xóa dòng" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xác nhận xóa" }));
    expect(await screen.findByRole("heading", { name: "Giỏ hàng đang trống" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY))).toEqual([]);
  });

  it("uses authenticated Customer APIs for update and delete", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACCESS_TOKEN_KEY, "customer-token");
    const initialCart = cartFromItems([cartItem()]);
    const fetchMock = vi.fn((url, options) => {
      if (url.includes("/auth/session")) {
        return Promise.resolve(response({
          account: {
            id: "8",
            role: "customer",
            fullName: "Khách SẢI",
            email: "khach@example.com",
            phone: "0900000000",
          },
        }));
      }
      if (options.method === "PATCH") {
        return Promise.resolve(response({ cart: cartFromItems([cartItem({ quantity: 3 })]) }));
      }
      if (options.method === "DELETE") {
        return Promise.resolve(response({ cart: cartFromItems([]) }));
      }
      return Promise.resolve(response({ cart: initialCart }));
    });
    renderCart(fetchMock);

    await screen.findByRole("link", { name: "Sải Cart" });
    await user.click(screen.getByRole("button", { name: "Tăng số lượng Sải Cart" }));
    await user.click(screen.getByRole("button", { name: "Cập nhật" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, options]) => options.method === "PATCH");
      expect(patchCall[0]).toMatch(/\/cart\/items\/11$/);
      expect(patchCall[1].headers.Authorization).toBe("Bearer customer-token");
      expect(JSON.parse(patchCall[1].body)).toEqual({ quantity: 3 });
    });

    await user.click(screen.getByRole("button", { name: "Xóa dòng" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    expect(await screen.findByRole("heading", { name: "Giỏ hàng đang trống" })).toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, options]) => options.method === "DELETE");
    expect(deleteCall[1].headers.Authorization).toBe("Bearer customer-token");
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/cart/validate"))).toBe(false);
  });

  it("shows a load error and retries to the empty state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Mất kết nối"))
      .mockResolvedValueOnce(response({ cart: cartFromItems([]) }));
    renderCart(fetchMock);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Giỏ hàng đang trống" })).toBeInTheDocument();
  });
});
