import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";

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

describe("customer authentication pages", () => {
  it("redirects guests from the profile page to customer login", async () => {
    renderRoute("/tai-khoan");

    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("shows backend field errors on registration", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu đăng ký chưa hợp lệ.",
          fields: { email: "Email không hợp lệ." },
        },
      }, 400),
    );
    renderRoute("/dang-ky");

    await user.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(await screen.findByText("Dữ liệu đăng ký chưa hợp lệ.")).toBeInTheDocument();
    expect(screen.getByText("Email không hợp lệ.")).toBeInTheDocument();
  });

  it("moves to login after successful registration without saving a token", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ account: { id: 9 } }, 201));
    renderRoute("/dang-ky");

    await user.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByText("Đăng ký thành công. Vui lòng đăng nhập.")).toBeInTheDocument();
    expect(localStorage).toHaveLength(0);
  });
});
