import { describe, expect, it, vi } from "vitest";

import { productListQuerySchema } from "../../src/schemas/product.schemas.js";
import { createProductService } from "../../src/services/product.service.js";

describe("public product query", () => {
  it("parses repeated ids, removes duplicates and defaults an invalid page", () => {
    const result = productListQuerySchema.parse({
      q: "  Giày Đẹp  ",
      brandId: ["2", "2", "3"],
      categoryId: "4",
      page: "không-hợp-lệ",
    });

    expect(result).toMatchObject({
      q: "Giày Đẹp",
      brandId: ["2", "3"],
      categoryId: ["4"],
      sizeId: [],
      colorId: [],
      sort: "newest",
      page: 1,
    });
  });

  it("rejects an inverted price range and unsupported sort", () => {
    expect(productListQuerySchema.safeParse({ minPrice: "20", maxPrice: "10" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ sort: "oldest" }).success).toBe(false);
  });

  it("normalizes Vietnamese search text before querying the repository", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({ rows: [], total: 0, pageSize: 12 }),
      getOptions: vi.fn(),
    };
    const service = createProductService(repository);

    await service.list(productListQuerySchema.parse({ q: "GIÀY Đế" }));

    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ q: "giay de" }));
  });
});
