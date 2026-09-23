import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";

const options = {
  brands: [],
  categories: [
    { id: "2", name: "Giày chạy" },
    { id: "5", name: "Giày thời trang" },
  ],
  sizes: [],
  colors: [],
};
const products = [
  {
    id: "10",
    name: "Sải Air Flow",
    slug: "sai-air-flow",
    category: { id: "2", name: "Giày chạy" },
    brand: { id: "1", name: "SẢI" },
    price: 1_200_000,
    salePrice: 990_000,
    effectivePrice: 990_000,
    badgeLabel: "featured",
    mainImage: "/uploads/shoe.webp",
    inStock: true,
  },
  {
    id: "11",
    name: "Sải City Walk",
    slug: "sai-city-walk",
    category: { id: "5", name: "Giày thời trang" },
    brand: { id: "1", name: "SẢI" },
    price: 850_000,
    salePrice: null,
    effectivePrice: 850_000,
    badgeLabel: null,
    mainImage: null,
    inStock: false,
  },
];
const productResult = { products, pagination: { page: 1, pageSize: 12, totalItems: 2, totalPages: 1 } };

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderHome(fetchImplementation) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(fetchImplementation);
  const view = render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
  return { ...view, fetchMock };
}

describe("public home page", () => {
  it("uses the shared storefront layout and links API categories to the catalog", async () => {
    const { container, fetchMock } = renderHome((url) =>
      Promise.resolve(response(url.includes("/products/options") ? options : productResult)),
    );

    expect(screen.getByRole("heading", { level: 1, name: /Sải bước,\s*đúng chất\./i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute("href", "/san-pham");
    expect(await screen.findByRole("link", { name: "Giày chạy" })).toHaveAttribute("href", "/san-pham?categoryId=2");
    expect(screen.getByRole("link", { name: "Giày thời trang" })).toHaveAttribute("href", "/san-pham?categoryId=5");
    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
    expect(document.title).toBe("Trang chủ | SẢI");

    expect(await screen.findByRole("heading", { name: "Sải Air Flow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sải City Walk" })).toBeInTheDocument();
    expect(screen.getByText("Nổi bật")).toBeInTheDocument();
    expect(screen.getByText("Còn hàng")).toBeInTheDocument();
    expect(screen.getByText("Hết hàng")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sải Air Flow" })).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("link", { name: "Xem tất cả" })).toHaveAttribute("href", "/san-pham");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const optionsCall = fetchMock.mock.calls.find(([url]) => url.endsWith("/products/options"));
    const productsCall = fetchMock.mock.calls.find(([url]) => /\/products\?/.test(url));
    expect(optionsCall[1].headers).not.toHaveProperty("Authorization");
    expect(productsCall[0]).toContain("sort=newest");
    expect(productsCall[0]).toContain("page=1");
    expect(productsCall[1].headers).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/admin/") || url.includes("sai-air-flow"))).toBe(false);
  });

  it("keeps the hero available and retries after a category error", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const { fetchMock } = renderHome((url) => {
      if (!url.includes("/products/options")) return Promise.resolve(response(productResult));
      attempts += 1;
      return attempts === 1
        ? Promise.resolve(response({ error: { code: "FAILED", message: "Lỗi nội bộ" } }, 500))
        : Promise.resolve(response(options));
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Sải bước,\s*đúng chất\./);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải danh mục lúc này.");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("link", { name: "Giày chạy" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("shows a clear empty category state", async () => {
    renderHome((url) => Promise.resolve(response(url.includes("/products/options") ? { ...options, categories: [] } : { ...productResult, products: [] })));
    expect(await screen.findByText("Chưa có danh mục sản phẩm.")).toBeInTheDocument();
    expect(await screen.findByText("Chưa có sản phẩm mới.")).toBeInTheDocument();
  });

  it("retries only the latest product request after an error", async () => {
    const user = userEvent.setup();
    let productAttempts = 0;
    const { fetchMock } = renderHome((url) => {
      if (url.includes("/products/options")) return Promise.resolve(response(options));
      productAttempts += 1;
      return productAttempts === 1
        ? Promise.resolve(response({ error: { code: "FAILED", message: "Lỗi nội bộ" } }, 500))
        : Promise.resolve(response(productResult));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải sản phẩm mới nhất lúc này.");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Giày chạy" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử tải lại sản phẩm" }));
    expect(await screen.findByRole("heading", { name: "Sải Air Flow" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/products/options"))).toHaveLength(1);
  });
});
