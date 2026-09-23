import { describe, expect, it } from "vitest";

import {
  createProductSchema,
  productListQuerySchema,
  reorderImagesSchema,
} from "../../src/schemas/admin-product.schemas.js";

const validProduct = {
  name: "Sải Run",
  description: "",
  material: "Vải",
  categoryId: 1,
  brandId: 1,
  price: 1200000,
  salePrice: 990000,
  badgeLabel: "new",
  variants: [{ sizeId: 1, colorId: 2, stockQuantity: 0 }],
};

describe("admin product validation", () => {
  it("normalizes optional product text", () => {
    const result = createProductSchema.parse(validProduct);
    expect(result.description).toBeNull();
  });

  it("does not inject nullable defaults into a partial update", async () => {
    const { updateProductSchema } = await import("../../src/schemas/admin-product.schemas.js");
    expect(updateProductSchema.parse({ name: "Tên mới" })).toEqual({ name: "Tên mới" });
  });

  it("rejects invalid prices and duplicate variants", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      salePrice: validProduct.price,
      variants: [validProduct.variants[0], validProduct.variants[0]],
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["salePrice", "variants.1"]),
    );
  });

  it("uses page one when the page query is invalid", () => {
    expect(productListQuerySchema.parse({ page: "invalid" }).page).toBe(1);
    expect(productListQuerySchema.parse({ page: "-2" }).page).toBe(1);
  });

  it("rejects duplicate image ids when reordering", () => {
    expect(reorderImagesSchema.safeParse({ imageIds: [1, 1] }).success).toBe(false);
  });
});
