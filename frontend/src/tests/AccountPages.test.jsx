import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";

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

function renderAuthenticatedRoute(path, fetchMock) {
  localStorage.setItem(ACCESS_TOKEN_KEY, "customer-token");
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("customer account pages", () => {
  it("keeps email read-only and updates the customer profile", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ account: customer }))
      .mockResolvedValueOnce(jsonResponse({ account: customer }))
      .mockResolvedValueOnce(jsonResponse({ account: { ...customer, fullName: "Nguyễn An" } }));
    renderAuthenticatedRoute("/tai-khoan", fetchMock);

    const emailInput = await screen.findByLabelText("Email (không thể thay đổi)");
    expect(emailInput).toBeDisabled();
    const fullNameInput = screen.getByLabelText("Họ và tên");
    await user.clear(fullNameInput);
    await user.type(fullNameInput, "Nguyễn An");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByText("Đã cập nhật thông tin cá nhân.")).toBeInTheDocument();
    const updateRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(updateRequest).toEqual({ fullName: "Nguyễn An", phone: customer.phone, defaultAddress: null });
    expect(updateRequest).not.toHaveProperty("email");
  });

  it("submits the current and confirmed new password", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ account: customer }))
      .mockResolvedValueOnce(jsonResponse({ message: "Đổi mật khẩu thành công." }));
    renderAuthenticatedRoute("/tai-khoan/doi-mat-khau", fetchMock);

    await screen.findByRole("heading", { name: "Đổi mật khẩu" });
    await user.type(screen.getByLabelText("Mật khẩu hiện tại"), "Customer123!");
    await user.type(screen.getByLabelText("Mật khẩu mới"), "Customer456!");
    await user.type(screen.getByLabelText("Xác nhận mật khẩu mới"), "Customer456!");
    await user.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    expect(await screen.findByText("Đổi mật khẩu thành công.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer customer-token");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      currentPassword: "Customer123!",
      newPassword: "Customer456!",
      newPasswordConfirmation: "Customer456!",
    });
  });
});
