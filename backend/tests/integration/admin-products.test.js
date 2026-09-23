import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAdminCatalogRepository } from "../../src/db/admin-catalog.repository.js";
import { createAdminProductRepository } from "../../src/db/admin-product.repository.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createTokenService } from "../../src/utils/jwt.js";
import { createSlugBase } from "../../src/utils/product-slug.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describeDatabase("admin product CRUD API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const productRepository = createAdminProductRepository(pool);
  const tokenService = createTokenService("product_test_jwt_secret_at_least_32_chars");
  let app;
  let adminToken;
  let customerToken;
  let categoryId;
  let brandId;
  let sizeId;
  let colorId;
  let secondSizeId;
  let secondColorId;
  let uploadDirectory;

  beforeAll(async () => {
    uploadDirectory = await mkdtemp(join(tmpdir(), "sai-admin-products-"));
    const hash = await argon2.hash("ProductPassword123!", { type: argon2.argon2id });
    const admin = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash)
       VALUES ('Product Admin', $1, $2) RETURNING id::text`,
      [`product-admin-${suffix}@example.com`, hash],
    );
    const lookups = await Promise.all([
      pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING id::text", [`Running-${suffix}`]),
      pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id::text", [`Sải-${suffix}`]),
      pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id::text", [`42-${suffix.slice(-4)}`]),
      pool.query(
        "INSERT INTO colors (name, hex_code) VALUES ($1, '#123ABC') RETURNING id::text",
        [`Cobalt-${suffix}`],
      ),
    ]);
    [categoryId, brandId, sizeId, colorId] = lookups.map((result) => result.rows[0].id);
    secondSizeId = (
      await pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id::text", [
        `43-${suffix.slice(-4)}`,
      ])
    ).rows[0].id;
    secondColorId = (
      await pool.query("INSERT INTO colors (name) VALUES ($1) RETURNING id::text", [
        `White-${suffix}`,
      ])
    ).rows[0].id;
    adminToken = await tokenService.signAccessToken({ accountId: admin.rows[0].id, role: "admin" });
    const customer = await authRepository.createCustomer({
      fullName: "Product Customer",
      email: `product-customer-${suffix}@example.com`,
      phone: `08${String(Date.now()).slice(-8)}`,
      passwordHash: hash,
    });
    customerToken = await tokenService.signAccessToken({
      accountId: customer.id,
      role: "customer",
    });
    app = createApp({
      authRepository,
      adminCatalogRepository: createAdminCatalogRepository(pool),
      adminProductRepository: productRepository,
      accessTokenService: tokenService,
      healthRepository: createHealthRepository(pool),
      uploadDirectory,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  function productData(name = "Giày Đế Mềm") {
    return {
      name,
      description: "Mô tả",
      material: "Vải",
      categoryId,
      brandId,
      price: 1200000,
      salePrice: 990000,
      badgeLabel: "featured",
      variants: [{ sizeId, colorId, stockQuantity: 4 }],
    };
  }

  async function createProduct(name) {
    return request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("data", JSON.stringify(productData(name)))
      .attach("images", png, { filename: "shoe.png", contentType: "image/png" });
  }

  it("creates a complete product with a random image and Vietnamese slug", async () => {
    const name = `Giày Đế Mềm ${suffix}`;
    const response = await createProduct(name);

    expect(response.status).toBe(201);
    expect(response.body.product).toMatchObject({
      slug: createSlugBase(name),
      badgeLabel: "featured",
      totalStock: 4,
      inStock: true,
    });
    expect(response.body.product.images).toHaveLength(1);
    const filename = decodeURIComponent(response.body.product.images[0].path.split("/").at(-1));
    expect(await readFile(join(uploadDirectory, filename))).toEqual(png);
  });

  it("uses a unique suffix and keeps slug immutable when the name changes", async () => {
    const name = `Giày Trùng Slug ${suffix}`;
    const first = await createProduct(name);
    const created = await createProduct(name);
    expect(first.status).toBe(201);
    expect(created.status).toBe(201);
    expect(created.body.product.slug).toBe(`${createSlugBase(name)}-2`);

    const updated = await request(app)
      .patch(`/api/admin/products/${created.body.product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Tên Hoàn Toàn Mới", price: 1300000, salePrice: null });
    expect(updated.status).toBe(200);
    expect(updated.body.product.slug).toBe(`${createSlugBase(name)}-2`);
    expect(updated.body.product.name).toBe("Tên Hoàn Toàn Mới");
  });

  it("searches without accents, filters and paginates in the database", async () => {
    const response = await request(app)
      .get("/api/admin/products")
      .query({ q: "de mem", categoryId, brandId, sort: "price_desc", page: "invalid" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    expect(response.body.items.every((item) => item.category.id === categoryId)).toBe(true);
  });

  it("does not change an existing order item snapshot when product data changes", async () => {
    const created = await createProduct(`Snapshot ${suffix}`);
    const product = created.body.product;
    const variantId = product.variants[0].id;
    const orderCode = `DH260923-${`A${String(Date.now()).slice(-5)}`.replace(/[01]/g, "A")}`;
    const order = await pool.query(
      `INSERT INTO orders
        (order_code, recipient_name, recipient_phone, recipient_province, recipient_district,
         recipient_ward, recipient_address_line, status, subtotal, shipping_fee, grand_total)
       VALUES ($1, 'Người nhận', '0900000099', 'Hà Nội', 'Ba Đình', 'Phúc Xá',
         'Số 1', 'pending_confirmation', 990000, 30000, 1020000)
       RETURNING id::text`,
      [orderCode],
    );
    await pool.query(
      `INSERT INTO order_items
        (order_id, product_id, product_variant_id, product_name, brand_name, size_value,
         color_name, image_path, unit_price, quantity, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 990000, 1, 990000)`,
      [
        order.rows[0].id,
        product.id,
        variantId,
        product.name,
        product.brand.name,
        product.variants[0].size.value,
        product.variants[0].color.name,
        product.images[0].path,
      ],
    );

    const updated = await request(app)
      .patch(`/api/admin/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Changed ${suffix}`, price: 2000000, salePrice: null });
    expect(updated.status).toBe(200);
    const snapshot = await pool.query(
      "SELECT product_name, unit_price::integer FROM order_items WHERE order_id = $1",
      [order.rows[0].id],
    );
    expect(snapshot.rows[0]).toEqual({ product_name: product.name, unit_price: 990000 });
  });

  it("rejects missing images and invalid references without partial products", async () => {
    const noImage = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("data", JSON.stringify(productData(`No image ${suffix}`)));
    expect(noImage.status).toBe(400);

    const invalid = productData(`Invalid ${suffix}`);
    invalid.categoryId = "999999999";
    const badReference = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("data", JSON.stringify(invalid))
      .attach("images", png, "shoe.png");
    expect(badReference.status).toBe(400);

    const count = await pool.query("SELECT count(*)::integer AS total FROM products WHERE name = $1", [invalid.name]);
    expect(count.rows[0].total).toBe(0);
  });

  it("soft deletes a product while retaining image and child rows", async () => {
    const created = await createProduct(`Delete ${suffix}`);
    const productId = created.body.product.id;
    const imagePath = created.body.product.images[0].path;
    const filename = decodeURIComponent(imagePath.split("/").at(-1));

    const deleted = await request(app)
      .delete(`/api/admin/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);
    expect((await request(app).get(`/api/admin/products/${productId}`).set("Authorization", `Bearer ${adminToken}`)).status).toBe(404);
    const rows = await pool.query(
      `SELECT products.deleted_at,
        (SELECT count(*)::integer FROM product_images WHERE product_id = products.id) AS images,
        (SELECT count(*)::integer FROM product_variants WHERE product_id = products.id) AS variants
       FROM products WHERE id = $1`,
      [productId],
    );
    expect(rows.rows[0]).toMatchObject({ images: 1, variants: 1 });
    expect(rows.rows[0].deleted_at).toBeTruthy();
    expect(await readFile(join(uploadDirectory, filename))).toEqual(png);
  });

  it("uploads, reorders and removes image records without deleting physical files", async () => {
    const created = await createProduct(`Images ${suffix}`);
    const productId = created.body.product.id;
    const added = await request(app)
      .post(`/api/admin/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("images", png, "second.png");
    expect(added.status).toBe(201);
    expect(added.body.product.images).toHaveLength(2);

    const reversedIds = added.body.product.images.map((image) => image.id).reverse();
    const reordered = await request(app)
      .put(`/api/admin/products/${productId}/images/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageIds: reversedIds });
    expect(reordered.status).toBe(200);
    expect(reordered.body.product.images.map((image) => image.id)).toEqual(reversedIds);

    const removedImage = reordered.body.product.images[1];
    const filename = decodeURIComponent(removedImage.path.split("/").at(-1));
    const removed = await request(app)
      .delete(`/api/admin/products/${productId}/images/${removedImage.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(removed.status).toBe(204);
    expect(await readFile(join(uploadDirectory, filename))).toEqual(png);

    const lastImage = await request(app)
      .delete(`/api/admin/products/${productId}/images/${reversedIds[0]}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(lastImage.status).toBe(409);
  });

  it("serves uploaded images cross-origin and does not expose filesystem paths", async () => {
    const created = await createProduct(`Static ${suffix}`);
    const imagePath = created.body.product.images[0].path;
    const response = await request(app).get(imagePath);

    expect(response.status).toBe(200);
    expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(response.headers["content-type"]).toMatch(/^image\/png/);
    expect(response.body).toEqual(png);
    const missing = await request(app).get("/uploads/..%2F..%2F.env");
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body)).not.toContain(uploadDirectory);
  });

  it("enforces eight images in total and requires an exact reorder set", async () => {
    const created = await createProduct(`Limit ${suffix}`);
    const productId = created.body.product.id;
    let addRequest = request(app)
      .post(`/api/admin/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`);
    for (let index = 0; index < 7; index += 1) {
      addRequest = addRequest.attach("images", png, `extra-${index}.png`);
    }
    const filled = await addRequest;
    expect(filled.status).toBe(201);
    expect(filled.body.product.images).toHaveLength(8);

    const ninth = await request(app)
      .post(`/api/admin/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("images", png, "ninth.png");
    expect(ninth.status).toBe(400);
    expect(ninth.body.error.code).toBe("PRODUCT_IMAGE_LIMIT");

    const incompleteOrder = await request(app)
      .put(`/api/admin/products/${productId}/images/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageIds: filled.body.product.images.slice(0, 7).map((image) => image.id) });
    expect(incompleteOrder.status).toBe(400);
  });

  it("checks image ownership before the last-image rule", async () => {
    const first = await createProduct(`Owner A ${suffix}`);
    const second = await createProduct(`Owner B ${suffix}`);
    const response = await request(app)
      .delete(`/api/admin/products/${first.body.product.id}/images/${second.body.product.images[0].id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(404);
  });

  it("rejects customer uploads before writing any file", async () => {
    const created = await createProduct(`Guard ${suffix}`);
    const before = await readdir(uploadDirectory);
    const response = await request(app)
      .post(`/api/admin/products/${created.body.product.id}/images`)
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("images", png, "blocked.png");
    const after = await readdir(uploadDirectory);

    expect(response.status).toBe(403);
    expect(after).toEqual(before);
  });

  it("rejects spoofed image bytes and files over 5 MiB", async () => {
    const data = JSON.stringify(productData(`Bad image ${suffix}`));
    const spoofed = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("data", data)
      .attach("images", Buffer.from("not png"), { filename: "fake.png", contentType: "image/png" });
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe("INVALID_IMAGE");

    const oversized = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("data", data)
      .attach("images", Buffer.alloc(5 * 1024 * 1024 + 1), "large.png");
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.code).toBe("INVALID_IMAGE_UPLOAD");
  });

  it("adds, updates, soft deletes and restores the same variant id", async () => {
    const created = await createProduct(`Variants ${suffix}`);
    const productId = created.body.product.id;
    const added = await request(app)
      .post(`/api/admin/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sizeId: secondSizeId, colorId: secondColorId, stockQuantity: 2 });
    expect(added.status).toBe(201);
    const variant = added.body.product.variants.find(
      (item) => item.size.id === secondSizeId && item.color.id === secondColorId,
    );
    expect(variant).toBeTruthy();

    const duplicate = await request(app)
      .post(`/api/admin/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sizeId: secondSizeId, colorId: secondColorId, stockQuantity: 9 });
    expect(duplicate.status).toBe(409);

    const updated = await request(app)
      .patch(`/api/admin/products/${productId}/variants/${variant.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stockQuantity: 7 });
    expect(updated.status).toBe(200);
    expect(updated.body.product.variants.find((item) => item.id === variant.id).stockQuantity).toBe(7);

    const removed = await request(app)
      .delete(`/api/admin/products/${productId}/variants/${variant.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(removed.status).toBe(204);
    const restored = await request(app)
      .post(`/api/admin/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sizeId: secondSizeId, colorId: secondColorId, stockQuantity: 3 });
    expect(restored.status).toBe(201);
    expect(restored.body.product.variants.find((item) => item.id === variant.id).stockQuantity).toBe(3);
  });

  it("blocks deleting the last active variant and rejects invalid stock", async () => {
    const created = await createProduct(`Last variant ${suffix}`);
    const productId = created.body.product.id;
    const variantId = created.body.product.variants[0].id;
    const invalid = await request(app)
      .patch(`/api/admin/products/${productId}/variants/${variantId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stockQuantity: -1 });
    expect(invalid.status).toBe(400);

    const removed = await request(app)
      .delete(`/api/admin/products/${productId}/variants/${variantId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(removed.status).toBe(409);
    expect(removed.body.error.code).toBe("LAST_PRODUCT_VARIANT");
  });

  it("serializes concurrent stock updates without producing an invalid value", async () => {
    const created = await createProduct(`Concurrent stock ${suffix}`);
    const productId = created.body.product.id;
    const variantId = created.body.product.variants[0].id;
    const [first, second] = await Promise.all([
      request(app)
        .patch(`/api/admin/products/${productId}/variants/${variantId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stockQuantity: 5 }),
      request(app)
        .patch(`/api/admin/products/${productId}/variants/${variantId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stockQuantity: 8 }),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const row = await pool.query(
      "SELECT stock_quantity FROM product_variants WHERE id = $1",
      [variantId],
    );
    expect([5, 8]).toContain(row.rows[0].stock_quantity);
    expect(row.rows[0].stock_quantity).toBeGreaterThanOrEqual(0);
  });
});
