import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";

const admin = { id: "1", role: "admin", fullName: "Admin SẢI", email: "admin@example.com" };
const listResult = {
  items: [{ id: "10", name: "Nike", createdAt: "2026-09-23", updatedAt: "2026-09-23" }],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPage(fetchImplementation) {
  localStorage.setItem(ACCESS_TOKEN_KEY, "admin-token");
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchImplementation);
  return render(
    <MemoryRouter initialEntries={["/admin/danh-muc?resource=brands"]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("AdminCatalogPage", () => {
  it("loads a paginated catalog list and renders the admin navigation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse(listResult));
    renderPage(fetchMock);

    expect(await screen.findByRole("heading", { name: "Danh mục & thuộc tính" })).toBeInTheDocument();
    expect(await screen.findByText("Nike")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Điều hướng quản trị" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/admin\/catalog\/brands/);
  });

  it("creates a new item and reloads the server list", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse(listResult))
      .mockResolvedValueOnce(jsonResponse({ item: { id: "11", name: "Adidas" } }, 201))
      .mockResolvedValueOnce(jsonResponse(listResult));
    renderPage(fetchMock);

    await screen.findByText("Nike");
    await user.type(screen.getByLabelText("Tên/giá trị"), "Adidas");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    expect(await screen.findByText("Đã thêm thành công.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[2][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ name: "Adidas" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).not.toContain("resource=");
  });

  it("requires confirmation and displays the backend usage conflict", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse(listResult))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "CATALOG_ITEM_IN_USE", message: "Đang dùng bởi 1 sản phẩm đang bán và 2 sản phẩm đã xóa mềm." } }, 409));
    renderPage(fetchMock);

    await screen.findByText("Nike");
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xác nhận xóa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/1 sản phẩm đang bán.*2 sản phẩm đã xóa mềm/);
  });
});
