import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";

const admin = {
  id: 3,
  role: "admin",
  fullName: "Quản trị viên",
  email: "admin@example.com",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("admin authentication pages", () => {
  it("redirects guests to the separate admin login page", async () => {
    renderRoute("/admin");

    expect(await screen.findByRole("heading", { name: "Đăng nhập quản trị" })).toBeInTheDocument();
  });

  it("logs in through the admin endpoint and opens the protected destination", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ accessToken: "admin-token", account: admin }))
      .mockResolvedValueOnce(jsonResponse({ message: "Khu vực quản trị.", account: admin }));
    renderRoute("/admin/dang-nhap");

    await user.type(screen.getByLabelText("Email quản trị"), admin.email);
    await user.type(screen.getByLabelText("Mật khẩu"), "Admin123!");
    await user.click(screen.getByRole("button", { name: "Đăng nhập quản trị" }));

    expect(await screen.findByRole("heading", { name: "Khu vực quản trị" })).toBeInTheDocument();
    expect(await screen.findByText("Khu vực quản trị.")).toBeInTheDocument();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("admin-token");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/auth\/login$/);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer admin-token");
  });

  it("redirects a customer session away from the admin route", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "customer-token");
    const customer = { ...admin, role: "customer", fullName: "Khách hàng", phone: "0901234567", defaultAddress: null };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ account: customer }))
      .mockResolvedValueOnce(jsonResponse({ account: customer }));
    renderRoute("/admin");

    expect(await screen.findByRole("heading", { name: "Thông tin cá nhân" })).toBeInTheDocument();
  });

  it("redirects an admin session away from customer account routes", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "admin-token");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse({ message: "Khu vực quản trị.", account: admin }));
    renderRoute("/tai-khoan");

    expect(await screen.findByRole("heading", { name: "Khu vực quản trị" })).toBeInTheDocument();
  });
});
