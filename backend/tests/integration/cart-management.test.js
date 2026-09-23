import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createCartRepository } from "../../src/db/cart.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createTokenService } from "../../src/utils/jwt.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;

describeDatabase("cart views", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const cartRepository = createCartRepository(pool);
  const tokenService = createTokenService("cart_management_test_secret_at_least_32_chars");
  let app;
  let customerId;
  let emptyCustomerId;
  let otherCustomerId;
  let customerToken;
  let emptyCustomerToken;
  let otherCustomerToken;
  let adminToken;
  let availableVariantId;
  let insufficientVariantId;
  let zeroStockVariantId;
  let deletedVariantId;
  let deletedProductVariantId;
  let otherVariantId;

  beforeAll(async () => {
    const passwordHash = await argon2.hash("CartManagement123!", { type: argon2.argon2id });
    const customer = await authRepository.createCustomer({
      fullName: "Khách xem giỏ",
      email: `cart-view-${suffix}@example.com`,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash,
    });
    const emptyCustomer = await authRepository.createCustomer({
      fullName: "Khách giỏ rỗng",
      email: `empty-cart-${suffix}@example.com`,
      phone: `08${String(Date.now() + 1).slice(-8)}`,
      passwordHash,
    });
    const otherCustomer = await authRepository.createCustomer({
      fullName: "Khách giỏ khác",
      email: `other-cart-${suffix}@example.com`,
      phone: `07${String(Date.now() + 2).slice(-8)}`,
      passwordHash,
    });
    const admin = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash)
       VALUES ('Cart View Admin', $1, $2)
       RETURNING id::text`,
      [`cart-view-admin-${suffix}@example.com`, passwordHash],
    );
    customerId = customer.id;
    emptyCustomerId = emptyCustomer.id;
    otherCustomerId = otherCustomer.id;
    customerToken = await tokenService.signAccessToken({ accountId: customerId, role: "customer" });
    emptyCustomerToken = await tokenService.signAccessToken({
      accountId: emptyCustomerId,
      role: "customer",
    });
    otherCustomerToken = await tokenService.signAccessToken({
      accountId: otherCustomerId,
      role: "customer",
    });
    adminToken = await tokenService.signAccessToken({
      accountId: admin.rows[0].id,
      role: "admin",
    });

    const category = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [`Cart view category ${suffix}`],
    );
    const brand = await pool.query(
      "INSERT INTO brands (name) VALUES ($1) RETURNING id",
      [`Cart view brand ${suffix}`],
    );
    const size = await pool.query(
      "INSERT INTO sizes (value) VALUES ($1) RETURNING id",
      [`CV-${suffix.slice(-18)}`],
    );
    const product = await pool.query(
      `INSERT INTO products
        (category_id, brand_id, name, search_name, slug, price, sale_price)
       VALUES ($1, $2, 'Sải Cart View', 'sai cart view', $3, 1000000, 800000)
       RETURNING id`,
      [category.rows[0].id, brand.rows[0].id, `cart-view-shoe-${suffix}`],
    );
    await pool.query(
      `INSERT INTO product_images (product_id, image_path, position)
       VALUES ($1, $2, 1)`,
      [product.rows[0].id, `cart-view-${suffix}.webp`],
    );

    const variantIds = [];
    for (const [index, setting] of [
      { stock: 5, deleted: false },
      { stock: 2, deleted: false },
      { stock: 0, deleted: false },
      { stock: 4, deleted: true },
    ].entries()) {
      const color = await pool.query(
        "INSERT INTO colors (name, hex_code) VALUES ($1, $2) RETURNING id",
        [`Cart view color ${index} ${suffix}`, `#00000${index}`],
      );
      const variant = await pool.query(
        `INSERT INTO product_variants
          (product_id, size_id, color_id, stock_quantity, deleted_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text`,
        [
          product.rows[0].id,
          size.rows[0].id,
          color.rows[0].id,
          setting.stock,
          setting.deleted ? new Date() : null,
        ],
      );
      variantIds.push(variant.rows[0].id);
    }
    [availableVariantId, insufficientVariantId, zeroStockVariantId, deletedVariantId] =
      variantIds;

    const otherColor = await pool.query(
      "INSERT INTO colors (name) VALUES ($1) RETURNING id",
      [`Cart other color ${suffix}`],
    );
    const otherVariant = await pool.query(
      `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
       VALUES ($1, $2, $3, 5)
       RETURNING id::text`,
      [product.rows[0].id, size.rows[0].id, otherColor.rows[0].id],
    );
    otherVariantId = otherVariant.rows[0].id;

    const deletedProduct = await pool.query(
      `INSERT INTO products
        (category_id, brand_id, name, search_name, slug, price, deleted_at)
       VALUES ($1, $2, 'Sải Deleted Cart', 'sai deleted cart', $3, 700000, now())
       RETURNING id`,
      [category.rows[0].id, brand.rows[0].id, `cart-deleted-shoe-${suffix}`],
    );
    const deletedProductColor = await pool.query(
      "INSERT INTO colors (name) VALUES ($1) RETURNING id",
      [`Cart deleted product color ${suffix}`],
    );
    const deletedProductVariant = await pool.query(
      `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
       VALUES ($1, $2, $3, 3)
       RETURNING id::text`,
      [deletedProduct.rows[0].id, size.rows[0].id, deletedProductColor.rows[0].id],
    );
    deletedProductVariantId = deletedProductVariant.rows[0].id;

    const cart = await pool.query(
      "INSERT INTO carts (customer_id) VALUES ($1) RETURNING id",
      [customerId],
    );
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_variant_id, quantity)
       VALUES ($1, $2, 2), ($1, $3, 3), ($1, $4, 1), ($1, $5, 1), ($1, $6, 1)`,
      [
        cart.rows[0].id,
        availableVariantId,
        insufficientVariantId,
        zeroStockVariantId,
        deletedVariantId,
        deletedProductVariantId,
      ],
    );
    const otherCart = await pool.query(
      "INSERT INTO carts (customer_id) VALUES ($1) RETURNING id",
      [otherCustomerId],
    );
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_variant_id, quantity)
       VALUES ($1, $2, 1)`,
      [otherCart.rows[0].id, otherVariantId],
    );

    app = createApp({
      authRepository,
      cartRepository,
      accessTokenService: tokenService,
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("validates a Guest cart without authentication or database writes", async () => {
    const cartsBefore = await pool.query("SELECT count(*)::integer AS total FROM carts");
    const response = await request(app)
      .post("/api/cart/validate")
      .send({
        items: [
          { productVariantId: availableVariantId, quantity: 1 },
          { productVariantId: availableVariantId, quantity: 2 },
          { productVariantId: insufficientVariantId, quantity: 3 },
          { productVariantId: zeroStockVariantId, quantity: 1 },
          { productVariantId: deletedVariantId, quantity: 1 },
          { productVariantId: deletedProductVariantId, quantity: 1 },
          { productVariantId: "9223372036854775807", quantity: 1 },
        ],
      });
    const cartsAfter = await pool.query("SELECT count(*)::integer AS total FROM carts");

    expect(response.status).toBe(200);
    expect(response.body.cart).toMatchObject({
      subtotal: 2_400_000,
      totalQuantity: 10,
      hasUnavailableItems: true,
    });
    expect(response.body.cart.items).toHaveLength(6);
    expect(response.body.cart.items[0]).toMatchObject({
      productVariantId: availableVariantId,
      quantity: 3,
      unitPrice: 800_000,
      lineTotal: 2_400_000,
      stockQuantity: 5,
      status: "available",
      product: {
        name: "Sải Cart View",
        mainImage: `/uploads/cart-view-${suffix}.webp`,
      },
    });
    expect(response.body.cart.items.map((item) => item.status)).toEqual([
      "available",
      "insufficient_stock",
      "out_of_stock",
      "not_for_sale",
      "not_for_sale",
      "not_for_sale",
    ]);
    expect(response.body.cart.items.at(-1)).toMatchObject({
      productVariantId: "9223372036854775807",
      product: null,
      variant: null,
      unitPrice: null,
      lineTotal: null,
      stockQuantity: null,
    });
    expect(cartsAfter.rows[0].total).toBe(cartsBefore.rows[0].total);
  });

  it("returns the authenticated Customer cart without hiding stale lines", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.cart).toMatchObject({
      subtotal: 1_600_000,
      totalQuantity: 8,
      hasUnavailableItems: true,
    });
    expect(response.body.cart.items.map((item) => item.status)).toEqual([
      "available",
      "insufficient_stock",
      "out_of_stock",
      "not_for_sale",
      "not_for_sale",
    ]);
  });

  it("returns an empty cart without creating one", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${emptyCustomerToken}`);
    const stored = await pool.query("SELECT id FROM carts WHERE customer_id = $1", [emptyCustomerId]);

    expect(response.status).toBe(200);
    expect(response.body.cart).toEqual({
      items: [],
      subtotal: 0,
      totalQuantity: 0,
      hasUnavailableItems: false,
    });
    expect(stored.rows).toEqual([]);
  });

  it("protects Customer reads and validates Guest input", async () => {
    expect((await request(app).get("/api/cart")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/cart")
          .set("Authorization", `Bearer ${adminToken}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/cart/validate")
          .send({ items: [{ productVariantId: "0", quantity: 1 }] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/cart/validate")
          .send({ items: Array.from({ length: 101 }, () => ({ productVariantId: "1", quantity: 1 })) })
      ).status,
    ).toBe(400);
  });

  it("updates the final quantity and serializes concurrent writes", async () => {
    const updated = await request(app)
      .patch(`/api/cart/items/${availableVariantId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 4 });

    expect(updated.status).toBe(200);
    expect(
      updated.body.cart.items.find((item) => item.productVariantId === availableVariantId),
    ).toMatchObject({ quantity: 4, lineTotal: 3_200_000, status: "available" });

    const responses = await Promise.all(
      [3, 5].map((quantity) =>
        request(app)
          .patch(`/api/cart/items/${availableVariantId}`)
          .set("Authorization", `Bearer ${customerToken}`)
          .send({ quantity }),
      ),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const stored = await pool.query(
      `SELECT ci.quantity
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.customer_id = $1 AND ci.product_variant_id = $2`,
      [customerId, availableVariantId],
    );
    expect([3, 5]).toContain(stored.rows[0].quantity);
  });

  it("rejects invalid, excessive, unavailable and missing updates", async () => {
    const update = (productVariantId, quantity) =>
      request(app)
        .patch(`/api/cart/items/${productVariantId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ quantity });

    expect((await update(availableVariantId, 0)).status).toBe(400);

    const exceeded = await update(availableVariantId, 6);
    expect(exceeded.status).toBe(409);
    expect(exceeded.body.error).toMatchObject({
      code: "CART_STOCK_EXCEEDED",
      fields: { quantity: "Biến thể này chỉ còn 5 sản phẩm." },
    });

    for (const productVariantId of [zeroStockVariantId, deletedVariantId, deletedProductVariantId]) {
      const response = await update(productVariantId, 1);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CART_ITEM_UNAVAILABLE");
    }

    const missing = await update(otherVariantId, 1);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CART_ITEM_NOT_FOUND");
  });

  it("does not modify another Customer cart", async () => {
    const update = await request(app)
      .patch(`/api/cart/items/${otherVariantId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 2 });
    const remove = await request(app)
      .delete(`/api/cart/items/${otherVariantId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    const otherCart = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${otherCustomerToken}`);

    expect(update.status).toBe(404);
    expect(remove.status).toBe(200);
    expect(otherCart.body.cart.items).toEqual([
      expect.objectContaining({ productVariantId: otherVariantId, quantity: 1 }),
    ]);
  });

  it("deletes a line idempotently and protects mutations", async () => {
    const remove = () =>
      request(app)
        .delete(`/api/cart/items/${deletedVariantId}`)
        .set("Authorization", `Bearer ${customerToken}`);

    expect((await remove()).status).toBe(200);
    expect((await remove()).status).toBe(200);
    const stored = await pool.query(
      `SELECT ci.id
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.customer_id = $1 AND ci.product_variant_id = $2`,
      [customerId, deletedVariantId],
    );
    expect(stored.rows).toEqual([]);

    expect(
      (
        await request(app)
          .patch(`/api/cart/items/${availableVariantId}`)
          .send({ quantity: 1 })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .delete(`/api/cart/items/${availableVariantId}`)
          .set("Authorization", `Bearer ${adminToken}`)
      ).status,
    ).toBe(403);
  });
});
