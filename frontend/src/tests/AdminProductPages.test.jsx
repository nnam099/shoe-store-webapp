import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ACCESS_TOKEN_KEY } from "../auth/auth-storage.js";

const admin = { id: "1", role: "admin", fullName: "Admin SẢI", email: "admin@example.com" };
const options = {
  categories: [{ id: "1", name: "Giày chạy" }],
  brands: [{ id: "2", name: "SẢI" }],
  sizes: [{ id: "3", name: "42" }],
  colors: [{ id: "4", name: "Cobalt", hex_code: "#2454D6" }],
};
const product = {
  id: "10",
  name: "Sải Run",
  slug: "sai-run",
  description: "Mô tả",
  material: "Vải",
  category: { id: "1", name: "Giày chạy" },
  brand: { id: "2", name: "SẢI" },
  price: 1200000,
  salePrice: 990000,
  effectivePrice: 990000,
  badgeLabel: "new",
  mainImage: "/uploads/a.png",
  images: [{ id: "20", path: "/uploads/a.png", position: 1 }],
  variants: [{ id: "30", size: { id: "3", value: "42" }, color: { id: "4", name: "Cobalt", hexCode: "#2454D6" }, stockQuantity: 5, inStock: true }],
  totalStock: 5,
  inStock: true,
};

function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderRoute(path, implementation) {
  localStorage.setItem(ACCESS_TOKEN_KEY, "admin-token");
  vi.spyOn(globalThis, "fetch").mockImplementation(implementation);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("admin product pages", () => {
  it("loads the server product list and soft deletes only after confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse({ items: [product], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }))
      .mockResolvedValueOnce(jsonResponse(options))
      .mockResolvedValueOnce(jsonResponse(null, 204));
    renderRoute("/admin/san-pham", fetchMock);

    expect(await screen.findByText("Sải Run")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/sort=newest/);
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xác nhận xóa" }));

    expect(await screen.findByText("Đã xóa mềm sản phẩm.")).toBeInTheDocument();
    expect(screen.queryByText("Sải Run")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[3][1].method).toBe("DELETE");
  });

  it("creates multipart data with an initial image and variant", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse(options))
      .mockResolvedValueOnce(jsonResponse({ product }, 201))
      .mockResolvedValueOnce(jsonResponse({ product }))
      .mockResolvedValueOnce(jsonResponse(options));
    renderRoute("/admin/san-pham/them", fetchMock);

    await screen.findByRole("heading", { name: "Thêm sản phẩm" });
    await user.type(screen.getByLabelText("Tên sản phẩm"), "Sải Run");
    await user.selectOptions(screen.getByLabelText("Loại giày"), "1");
    await user.selectOptions(screen.getByLabelText("Thương hiệu"), "2");
    await user.type(screen.getByLabelText("Giá bán (VND)"), "1200000");
    await user.selectOptions(screen.getByLabelText("Size biến thể 1"), "3");
    await user.selectOptions(screen.getByLabelText("Màu biến thể 1"), "4");
    const file = new File(["image"], "shoe.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Ảnh sản phẩm"), file);
    await user.click(screen.getByRole("button", { name: "Tạo sản phẩm" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const request = fetchMock.mock.calls[2][1];
    expect(request.body).toBeInstanceOf(FormData);
    const data = JSON.parse(request.body.get("data"));
    expect(data).toMatchObject({ name: "Sải Run", categoryId: 1, brandId: 2, price: 1200000 });
    expect(data.variants).toEqual([{ sizeId: 3, colorId: 4, stockQuantity: 0 }]);
    expect(request.body.getAll("images")).toHaveLength(1);
    expect(request.headers).not.toHaveProperty("Content-Type");
  });

  it("keeps slug read-only and uploads additional images on the edit page", async () => {
    const user = userEvent.setup();
    const updated = { ...product, images: [...product.images, { id: "21", path: "/uploads/b.png", position: 2 }] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ account: admin }))
      .mockResolvedValueOnce(jsonResponse({ product }))
      .mockResolvedValueOnce(jsonResponse(options))
      .mockResolvedValueOnce(jsonResponse({ product: updated }));
    renderRoute("/admin/san-pham/10", fetchMock);

    expect(await screen.findByText("sai-run")).toBeInTheDocument();
    expect(screen.queryByLabelText(/slug/i)).not.toBeInTheDocument();
    const file = new File(["image"], "second.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Thêm ảnh"), file);

    expect(await screen.findByAltText("Ảnh sản phẩm 2")).toBeInTheDocument();
    expect(fetchMock.mock.calls[3][1].body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[3][1].body.getAll("images")).toHaveLength(1);
  });
});
