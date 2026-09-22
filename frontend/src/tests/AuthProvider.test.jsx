import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";
import { useAuth } from "../auth/useAuth.js";
import { GUEST_CART_KEY } from "../cart/guest-cart-storage.js";

const customer = {
  id: 7,
  role: "customer",
  fullName: "Nguyễn Văn An",
  email: "an@example.com",
  phone: "0901234567",
  defaultAddress: null,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function LoginHarness() {
  const auth = useAuth();
  const [message, setMessage] = useState("");

  async function login() {
    const result = await auth.loginCustomer({ identifier: customer.email, password: "Customer123!" });
    setMessage(result.mergeError ?? result.mergeMessage ?? "Đã đăng nhập");
  }

  return (
    <div>
      <button type="button" onClick={login}>Đăng nhập thử</button>
      <p>{auth.status}</p>
      <p>{message}</p>
    </div>
  );
}

describe("AuthProvider", () => {
  it("stores the token and only clears the guest cart after a successful merge", async () => {
    const user = userEvent.setup();
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ productVariantId: 11, quantity: 3 }]));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ accessToken: "customer-token", account: customer }))
      .mockResolvedValueOnce(jsonResponse({ cart: { items: [] }, adjustments: [] }));

    render(<AuthProvider><LoginHarness /></AuthProvider>);
    await user.click(screen.getByRole("button", { name: "Đăng nhập thử" }));

    expect(await screen.findByText("Đã đăng nhập")).toBeInTheDocument();
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("customer-token");
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer customer-token");
  });

  it("keeps the guest cart when merge fails after login", async () => {
    const user = userEvent.setup();
    const guestCart = JSON.stringify([{ productVariantId: 12, quantity: 1 }]);
    localStorage.setItem(GUEST_CART_KEY, guestCart);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ accessToken: "customer-token", account: customer }))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Lỗi" } }, 500));

    render(<AuthProvider><LoginHarness /></AuthProvider>);
    await user.click(screen.getByRole("button", { name: "Đăng nhập thử" }));

    expect(await screen.findByText(/chưa thể gộp giỏ/i)).toBeInTheDocument();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("customer-token");
    expect(localStorage.getItem(GUEST_CART_KEY)).toBe(guestCart);
  });

  it("restores a saved session and removes an invalid token on 401", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ error: { code: "INVALID_TOKEN", message: "Phiên đăng nhập không hợp lệ" } }, 401),
    );

    render(<AuthProvider><LoginHarness /></AuthProvider>);

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });
});
