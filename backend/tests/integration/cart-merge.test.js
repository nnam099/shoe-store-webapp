import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createCartRepository } from "../../src/db/cart.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createCartMergeService } from "../../src/services/cart-merge.service.js";
import { createTokenService } from "../../src/utils/jwt.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const fixtureSuffix = `${process.pid}-${Date.now()}`;
const jwtSecret = "cart_merge_test_jwt_secret_at_least_32_chars";

describeDatabase("POST /api/cart/merge", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const cartRepository = createCartRepository(pool);
  const accessTokenService = createTokenService(jwtSecret);
  let app;
  let customerId;
  let rollbackCustomerId;
  let adminId;
  let accessToken;
  let adminToken;
  let availableVariantId;
  let cappedVariantId;
  let unavailableVariantId;
  let zeroStockVariantId;

  beforeAll(async () => {
    const passwordHash = await argon2.hash("CartPassword123!", { type: argon2.argon2id });
    const customer = await authRepository.createCustomer({
      fullName: "Khách Gộp Giỏ",
      email: `cart-${fixtureSuffix}@example.com`,
      phone: `04${String(Date.now()).slice(-8)}`,
      passwordHash,
    });
    const rollbackCustomer = await authRepository.createCustomer({
      fullName: "Khách Rollback",
      email: `rollback-${fixtureSuffix}@example.com`,
      phone: `03${String(Date.now() + 1).slice(-8)}`,
      passwordHash,
    });
    const admin = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      ["Admin Test", `admin-${fixtureSuffix}@example.com`, passwordHash],
    );
    customerId = customer.id;
    rollbackCustomerId = rollbackCustomer.id;
    adminId = admin.rows[0].id;

    const category = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [`Cart category ${fixtureSuffix}`],
    );
    const brand = await pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id", [
      `Cart brand ${fixtureSuffix}`,
    ]);
    const size = await pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id", [
      `Cart size ${fixtureSuffix}`,
    ]);
    const colorIds = [];
    for (const colorName of ["Available", "Capped", "Unavailable", "Zero stock"]) {
      const color = await pool.query("INSERT INTO colors (name) VALUES ($1) RETURNING id", [
        `${colorName} ${fixtureSuffix}`,
      ]);
      colorIds.push(color.rows[0].id);
    }
    const product = await pool.query(
      `INSERT INTO products (category_id, brand_id, name, search_name, slug, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        category.rows[0].id,
        brand.rows[0].id,
        "Cart Test Shoe",
        "cart test shoe",
        `cart-test-shoe-${fixtureSuffix}`,
        900000,
      ],
    );
    const variantIds = [];
    for (let index = 0; index < colorIds.length; index += 1) {
      const variant = await pool.query(
        `INSERT INTO product_variants
          (product_id, size_id, color_id, stock_quantity, deleted_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text`,
        [
          product.rows[0].id,
          size.rows[0].id,
          colorIds[index],
          index === 3 ? 0 : 5,
          index === 2 ? new Date() : null,
        ],
      );
      variantIds.push(variant.rows[0].id);
    }
    [availableVariantId, cappedVariantId, unavailableVariantId, zeroStockVariantId] = variantIds;
    accessToken = await accessTokenService.signAccessToken({
      accountId: customerId,
      role: "customer",
    });
    adminToken = await accessTokenService.signAccessToken({ accountId: adminId, role: "admin" });
  });

  beforeEach(() => {
    app = createApp({
      authRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("aggregates duplicate local items, caps stock and reports unavailable variants", async () => {
    const firstMerge = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        items: [
          { productVariantId: availableVariantId, quantity: 1 },
          { productVariantId: availableVariantId, quantity: 2 },
          { productVariantId: cappedVariantId, quantity: 4 },
          { productVariantId: unavailableVariantId, quantity: 1 },
          { productVariantId: zeroStockVariantId, quantity: 1 },
          { productVariantId: "999999999", quantity: 1 },
        ],
      });

    expect(firstMerge.status).toBe(200);
    expect(firstMerge.body.cart.items).toEqual([
      { productVariantId: availableVariantId, quantity: 3 },
      { productVariantId: cappedVariantId, quantity: 4 },
    ]);
    expect(firstMerge.body.adjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productVariantId: availableVariantId,
          requestedQuantity: 3,
          finalQuantity: 3,
          status: "merged",
        }),
        expect.objectContaining({ productVariantId: unavailableVariantId, status: "unavailable" }),
        expect.objectContaining({ productVariantId: zeroStockVariantId, status: "unavailable" }),
        expect.objectContaining({ productVariantId: "999999999", status: "unavailable" }),
      ]),
    );

    const secondMerge = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ items: [{ productVariantId: cappedVariantId, quantity: 4 }] });
    expect(secondMerge.status).toBe(200);
    expect(secondMerge.body.adjustments[0]).toMatchObject({
      previousQuantity: 4,
      finalQuantity: 5,
      status: "capped",
    });
  });

  it("serializes concurrent merges so the cart never exceeds stock", async () => {
    const resetCart = await pool.query("SELECT id FROM carts WHERE customer_id = $1", [customerId]);
    if (resetCart.rows[0]) {
      await pool.query(
        "DELETE FROM cart_items WHERE cart_id = $1 AND product_variant_id = $2",
        [resetCart.rows[0].id, availableVariantId],
      );
    }

    const mergeRequest = () =>
      request(app)
        .post("/api/cart/merge")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ items: [{ productVariantId: availableVariantId, quantity: 4 }] });
    const responses = await Promise.all([mergeRequest(), mergeRequest()]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    const stored = await pool.query(
      `SELECT ci.quantity
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.customer_id = $1 AND ci.product_variant_id = $2`,
      [customerId, availableVariantId],
    );
    expect(stored.rows[0].quantity).toBe(5);
  });

  it("rejects missing authentication and the admin role", async () => {
    const body = { items: [{ productVariantId: availableVariantId, quantity: 1 }] };
    expect((await request(app).post("/api/cart/merge").send(body)).status).toBe(401);
    const adminResponse = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body);
    expect(adminResponse.status).toBe(403);
  });

  it("rolls back the cart when an unexpected write fails", async () => {
    const failingRepository = {
      ...cartRepository,
      async upsertCartItem(client, item) {
        await cartRepository.upsertCartItem(client, item);
        throw new Error("forced test failure");
      },
    };
    const service = createCartMergeService(failingRepository);

    await expect(
      service.mergeGuestCart({
        customerId: rollbackCustomerId,
        items: [{ productVariantId: availableVariantId, quantity: 2 }],
      }),
    ).rejects.toThrow("forced test failure");

    const stored = await pool.query("SELECT id FROM carts WHERE customer_id = $1", [
      rollbackCustomerId,
    ]);
    expect(stored.rows).toEqual([]);
  });
});
