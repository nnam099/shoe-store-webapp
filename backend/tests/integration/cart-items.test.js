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

describeDatabase("POST /api/cart/items", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const cartRepository = createCartRepository(pool);
  const tokenService = createTokenService("cart_item_test_jwt_secret_at_least_32_chars");
  let app;
  let customerId;
  let customerToken;
  let adminToken;
  let availableVariantId;
  let concurrentVariantId;
  let zeroStockVariantId;
  let deletedVariantId;

  beforeAll(async () => {
    const passwordHash = await argon2.hash("CartItemPassword123!", { type: argon2.argon2id });
    const customer = await authRepository.createCustomer({
      fullName: "Khách thêm giỏ",
      email: `cart-item-${suffix}@example.com`,
      phone: `02${String(Date.now()).slice(-8)}`,
      passwordHash,
    });
    const admin = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash)
       VALUES ('Cart Item Admin', $1, $2) RETURNING id::text`,
      [`cart-item-admin-${suffix}@example.com`, passwordHash],
    );
    customerId = customer.id;
    customerToken = await tokenService.signAccessToken({ accountId: customer.id, role: "customer" });
    adminToken = await tokenService.signAccessToken({ accountId: admin.rows[0].id, role: "admin" });

    const category = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [`Cart item category ${suffix}`],
    );
    const brand = await pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id", [
      `Cart item brand ${suffix}`,
    ]);
    const size = await pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id", [
      `CI-${suffix.slice(-20)}`,
    ]);
    const product = await pool.query(
      `INSERT INTO products (category_id, brand_id, name, search_name, slug, price)
       VALUES ($1, $2, 'Cart Item Shoe', 'cart item shoe', $3, 900000)
       RETURNING id`,
      [category.rows[0].id, brand.rows[0].id, `cart-item-shoe-${suffix}`],
    );
    const variants = [];
    for (const [index, setting] of [
      { stock: 5, deleted: false },
      { stock: 5, deleted: false },
      { stock: 0, deleted: false },
      { stock: 5, deleted: true },
    ].entries()) {
      const color = await pool.query("INSERT INTO colors (name) VALUES ($1) RETURNING id", [
        `Cart item color ${index} ${suffix}`,
      ]);
      const variant = await pool.query(
        `INSERT INTO product_variants
          (product_id, size_id, color_id, stock_quantity, deleted_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
        [
          product.rows[0].id,
          size.rows[0].id,
          color.rows[0].id,
          setting.stock,
          setting.deleted ? new Date() : null,
        ],
      );
      variants.push(variant.rows[0].id);
    }
    [availableVariantId, concurrentVariantId, zeroStockVariantId, deletedVariantId] = variants;

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

  it("adds one cart line and accumulates without exceeding stock", async () => {
    const first = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productVariantId: availableVariantId, quantity: 2 });
    expect(first.status).toBe(200);
    expect(first.body.item).toEqual({ productVariantId: availableVariantId, quantity: 2 });

    const second = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productVariantId: availableVariantId, quantity: 2 });
    expect(second.status).toBe(200);
    expect(second.body.item.quantity).toBe(4);

    const exceeded = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productVariantId: availableVariantId, quantity: 2 });
    expect(exceeded.status).toBe(409);
    expect(exceeded.body.error.code).toBe("CART_STOCK_EXCEEDED");

    const stored = await pool.query(
      `SELECT cart_items.quantity
       FROM cart_items JOIN carts ON carts.id = cart_items.cart_id
       WHERE carts.customer_id = $1 AND cart_items.product_variant_id = $2`,
      [customerId, availableVariantId],
    );
    expect(stored.rows[0].quantity).toBe(4);
  });

  it("rejects missing auth, the admin role and invalid quantities", async () => {
    const body = { productVariantId: availableVariantId, quantity: 1 };
    expect((await request(app).post("/api/cart/items").send(body)).status).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/cart/items")
          .set("Authorization", `Bearer ${adminToken}`)
          .send(body)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/cart/items")
          .set("Authorization", `Bearer ${customerToken}`)
          .send({ ...body, quantity: 0 })
      ).status,
    ).toBe(400);
  });

  it("rejects zero-stock, deleted and unknown variants", async () => {
    for (const productVariantId of [zeroStockVariantId, deletedVariantId, "999999999"]) {
      const response = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productVariantId, quantity: 1 });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CART_ITEM_UNAVAILABLE");
    }
  });

  it("serializes concurrent additions so only one request can exceed the remaining stock", async () => {
    const add = () =>
      request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productVariantId: concurrentVariantId, quantity: 3 });
    const responses = await Promise.all([add(), add()]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const stored = await pool.query(
      `SELECT cart_items.quantity
       FROM cart_items JOIN carts ON carts.id = cart_items.cart_id
       WHERE carts.customer_id = $1 AND cart_items.product_variant_id = $2`,
      [customerId, concurrentVariantId],
    );
    expect(stored.rows[0].quantity).toBe(3);
  });
});
