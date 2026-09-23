import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App.jsx";
import { AuthProvider } from "../auth/AuthProvider.jsx";

const options = {
  brands: [{ id: "1", name: "SẢI" }],
  categories: [{ id: "2", name: "Giày chạy" }],
  sizes: [{ id: "3", name: "42" }],
  colors: [{ id: "4", name: "Cobalt", hex_code: "#2454D6" }],
};
const product = {
  id: "10",
  name: "Sải Air Flow",
  slug: "sai-air-flow",
  category: { id: "2", name: "Giày chạy" },
  brand: { id: "1", name: "SẢI" },
  price: 1_200_000,
  salePrice: 990_000,
  effectivePrice: 990_000,
  badgeLabel: "new",
  mainImage: "/uploads/shoe.webp",
  inStock: true,
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage(path, fetchImplementation) {
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchImplementation);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("public product list page", () => {
  it("loads publicly from URL filters and never renders exact stock", async () => {
    const fetchMock = vi.fn((url) => {
      if (url.includes("/products/options")) return Promise.resolve(response(options));
      return Promise.resolve(response({ products: [product], pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 } }));
    });
    renderPage("/san-pham?q=air&brandId=1&sizeId=3", fetchMock);

    expect(await screen.findByRole("heading", { name: "Sải Air Flow" })).toBeInTheDocument();
    expect(screen.getByText("Còn hàng")).toBeInTheDocument();
    expect(screen.queryByText(/Còn hàng \(/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sải Air Flow" })).toHaveAttribute("loading", "lazy");
    const listUrl = fetchMock.mock.calls.map(([url]) => url).find((url) => /\/products\?/.test(url));
    expect(listUrl).toContain("q=air");
    expect(listUrl).toContain("brandId=1");
    expect(listUrl).toContain("sizeId=3");
  });

  it("applies search and filters on submit while sort applies immediately", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url) => {
      if (url.includes("/products/options")) return Promise.resolve(response(options));
      return Promise.resolve(response({ products: [product], pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 } }));
    });
    renderPage("/san-pham", fetchMock);
    await screen.findByRole("heading", { name: "Sải Air Flow" });

    await user.type(screen.getByLabelText("Tìm theo tên sản phẩm"), "giay chay");
    await user.click(screen.getByLabelText("SẢI"));
    const callsBeforeApply = fetchMock.mock.calls.filter(([url]) => /\/products\?/.test(url)).length;
    expect(callsBeforeApply).toBe(1);
    await user.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls.some((url) => url.includes("q=giay+chay") && url.includes("brandId=1"))).toBe(true);
    });

    await user.selectOptions(screen.getByLabelText("Sắp xếp sản phẩm"), "price_desc");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("sort=price_desc"))).toBe(true));
  });

  it("shows empty and error states clearly", async () => {
    const emptyFetch = vi.fn((url) =>
      Promise.resolve(
        url.includes("/products/options")
          ? response(options)
          : response({ products: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } }),
      ),
    );
    const { unmount } = renderPage("/san-pham", emptyFetch);
    expect(await screen.findByText("Không tìm thấy sản phẩm")).toBeInTheDocument();
    unmount();

    renderPage("/san-pham", (url) =>
      Promise.resolve(url.includes("/products/options") ? response(options) : response({ error: { code: "FAILED", message: "Không tải được sản phẩm." } }, 500)),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được sản phẩm.");
  });
});
