import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createProductRepository } from "../../src/db/product.repository.js";
import { normalizeSearchText } from "../../src/utils/product-slug.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;

describeDatabase("public product catalog API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  let app;
  let categoryA;
  let categoryB;
  let brandA;
  let brandB;
  let sizeA;
  let sizeB;
  let colorA;
  let colorB;
  let firstProduct;
  let secondProduct;
  let soldOutProduct;

  async function createProduct({
    name,
    categoryId = categoryA,
    brandId = brandA,
    price = 1_200_000,
    salePrice = null,
    badgeLabel = null,
    variants,
    createdAt,
  }) {
    const product = await pool.query(
      `INSERT INTO products
        (category_id, brand_id, name, search_name, slug, price, sale_price, badge_label, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, now()))
       RETURNING id::text, slug`,
      [
        categoryId,
        brandId,
        name,
        normalizeSearchText(name),
        `public-${suffix}-${normalizeSearchText(name).replace(/[^a-z0-9]+/g, "-")}`,
        price,
        salePrice,
        badgeLabel,
        createdAt,
      ],
    );
    await pool.query(
      "INSERT INTO product_images (product_id, image_path, position) VALUES ($1, $2, 1)",
      [product.rows[0].id, `public-${suffix}-${product.rows[0].id}.webp`],
    );
    for (const variant of variants) {
      await pool.query(
        `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
         VALUES ($1, $2, $3, $4)`,
        [product.rows[0].id, variant.sizeId, variant.colorId, variant.stock],
      );
    }
    return product.rows[0];
  }

  beforeAll(async () => {
    const lookups = await Promise.all([
      pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING id::text", [`Thể thao ${suffix}`]),
      pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING id::text", [`Đi bộ ${suffix}`]),
      pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id::text", [`Nhãn A ${suffix}`]),
      pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id::text", [`Nhãn B ${suffix}`]),
      pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id::text", [`40-${suffix}`]),
      pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id::text", [`41-${suffix}`]),
      pool.query("INSERT INTO colors (name, hex_code) VALUES ($1, '#112233') RETURNING id::text", [`Đỏ ${suffix}`]),
      pool.query("INSERT INTO colors (name, hex_code) VALUES ($1, '#445566') RETURNING id::text", [`Xanh ${suffix}`]),
    ]);
    [categoryA, categoryB, brandA, brandB, sizeA, sizeB, colorA, colorB] = lookups.map(
      (result) => result.rows[0].id,
    );

    firstProduct = await createProduct({
      name: `Giày Thể Thao Đế Mềm ${suffix}`,
      price: 1_200_000,
      salePrice: 900_000,
      badgeLabel: "featured",
      createdAt: "2026-01-01T00:00:00Z",
      variants: [
        { sizeId: sizeA, colorId: colorA, stock: 3 },
        { sizeId: sizeB, colorId: colorB, stock: 0 },
      ],
    });
    secondProduct = await createProduct({
      name: `Giày Đi Bộ ${suffix}`,
      categoryId: categoryB,
      brandId: brandB,
      price: 800_000,
      createdAt: "2026-02-01T00:00:00Z",
      variants: [{ sizeId: sizeA, colorId: colorB, stock: 2 }],
    });
    soldOutProduct = await createProduct({
      name: `Giày Hết Hàng ${suffix}`,
      price: 700_000,
      createdAt: "2026-03-01T00:00:00Z",
      variants: [{ sizeId: sizeA, colorId: colorA, stock: 0 }],
    });

    for (let index = 0; index < 13; index += 1) {
      await createProduct({
        name: `Phân Trang ${String(index).padStart(2, "0")} ${suffix}`,
        brandId: brandB,
        price: 1_500_000 + index,
        variants: [{ sizeId: sizeA, colorId: colorB, stock: 1 }],
      });
    }

    app = createApp({
      productRepository: createProductRepository(pool),
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("is public, searches without accents and does not expose exact stock", async () => {
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", "Bearer token-khong-hop-le")
      .query({ q: "GIAY THE THAO DE MEM" });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0]).toMatchObject({
      id: firstProduct.id,
      inStock: true,
      effectivePrice: 900_000,
      badgeLabel: "featured",
    });
    expect(response.body.products[0]).not.toHaveProperty("totalStock");
    expect(response.body.products[0]).not.toHaveProperty("variants");
  });

  it("uses OR within groups and AND across groups with one matching in-stock variant", async () => {
    const matching = await request(app)
      .get("/api/products")
      .query({ brandId: [brandA, brandB], sizeId: sizeA, colorId: colorB, q: "giay" });
    expect(matching.status).toBe(200);
    expect(matching.body.products.map((product) => product.id)).toContain(secondProduct.id);
    expect(matching.body.products.map((product) => product.id)).not.toContain(firstProduct.id);

    const noCrossVariantMatch = await request(app)
      .get("/api/products")
      .query({ brandId: brandA, sizeId: sizeA, colorId: colorB, q: "giay" });
    expect(noCrossVariantMatch.status).toBe(200);
    expect(noCrossVariantMatch.body.products).toEqual([]);
  });

  it("filters and sorts by effective price with all four allowed sorts", async () => {
    const ascending = await request(app)
      .get("/api/products")
      .query({ q: suffix, minPrice: 750_000, maxPrice: 950_000, sort: "price_asc" });
    expect(ascending.status).toBe(200);
    expect(ascending.body.products.slice(0, 2).map((product) => product.id)).toEqual([
      secondProduct.id,
      firstProduct.id,
    ]);

    for (const sort of ["newest", "price_asc", "price_desc", "name_asc"]) {
      expect((await request(app).get("/api/products").query({ q: suffix, sort })).status).toBe(200);
    }
    expect((await request(app).get("/api/products").query({ sort: "oldest" })).status).toBe(400);
  });

  it("returns 12 products per page and defaults an invalid page to one", async () => {
    const firstPage = await request(app)
      .get("/api/products")
      .query({ q: "phan trang", brandId: brandB, page: "sai" });
    const secondPage = await request(app)
      .get("/api/products")
      .query({ q: "phan trang", brandId: brandB, page: 2 });

    expect(firstPage.body.products).toHaveLength(12);
    expect(firstPage.body.pagination).toEqual({ page: 1, pageSize: 12, totalItems: 13, totalPages: 2 });
    expect(secondPage.body.products).toHaveLength(1);
  });

  it("reports product-level stock and excludes soft-deleted products", async () => {
    const response = await request(app).get("/api/products").query({ q: "giay het hang" });
    expect(response.status).toBe(200);
    expect(response.body.products[0]).toMatchObject({ id: soldOutProduct.id, inStock: false });

    await pool.query("UPDATE products SET deleted_at = now() WHERE id = $1", [soldOutProduct.id]);
    const deleted = await request(app).get("/api/products").query({ q: "giay het hang" });
    expect(deleted.body.products).toEqual([]);
  });

  it("returns only filter options connected to active sellable data", async () => {
    const response = await request(app).get("/api/products/options");

    expect(response.status).toBe(200);
    expect(response.body.brands.map((item) => item.id)).toEqual(expect.arrayContaining([brandA, brandB]));
    expect(response.body.categories.map((item) => item.id)).toEqual(expect.arrayContaining([categoryA, categoryB]));
    expect(response.body.sizes.map((item) => item.id)).toContain(sizeA);
    expect(response.body.colors.map((item) => item.id)).toEqual(expect.arrayContaining([colorA, colorB]));
  });

  it("returns public detail with ordered images and active variants including zero stock", async () => {
    const detailProduct = await createProduct({
      name: `Chi Tiết Công Khai ${suffix}`,
      badgeLabel: "new",
      variants: [
        { sizeId: sizeA, colorId: colorA, stock: 4 },
        { sizeId: sizeB, colorId: colorB, stock: 0 },
      ],
    });
    const deletedVariant = await pool.query(
      `INSERT INTO product_variants
        (product_id, size_id, color_id, stock_quantity, deleted_at)
       VALUES ($1, $2, $3, 9, now()) RETURNING id::text`,
      [detailProduct.id, sizeA, colorB],
    );
    await pool.query(
      "INSERT INTO product_images (product_id, image_path, position) VALUES ($1, $2, 2)",
      [detailProduct.id, `public-${suffix}-detail-second.webp`],
    );

    const response = await request(app).get(`/api/products/${detailProduct.slug}`);

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({
      id: detailProduct.id,
      badgeLabel: "new",
      inStock: true,
    });
    expect(response.body.product.images.map((image) => image.position)).toEqual([1, 2]);
    expect(response.body.product.variants).toHaveLength(2);
    expect(response.body.product.variants.some((variant) => variant.stockQuantity === 0)).toBe(true);
    expect(response.body.product.variants.map((variant) => variant.id)).not.toContain(
      deletedVariant.rows[0].id,
    );
  });

  it("returns a normalized 404 for missing or soft-deleted product detail", async () => {
    const missing = await request(app).get("/api/products/san-pham-khong-ton-tai");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("PRODUCT_NOT_FOUND");

    const product = await createProduct({
      name: `Chi Tiết Đã Xóa ${suffix}`,
      variants: [{ sizeId: sizeA, colorId: colorA, stock: 1 }],
    });
    await pool.query("UPDATE products SET deleted_at = now() WHERE id = $1", [product.id]);
    const deleted = await request(app).get(`/api/products/${product.slug}`);
    expect(deleted.status).toBe(404);
    expect(deleted.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });
});
