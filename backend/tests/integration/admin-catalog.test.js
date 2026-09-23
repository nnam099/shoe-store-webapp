import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAdminCatalogRepository } from "../../src/db/admin-catalog.repository.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createTokenService } from "../../src/utils/jwt.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;

describeDatabase("admin catalog API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const adminCatalogRepository = createAdminCatalogRepository(pool);
  const tokenService = createTokenService("catalog_test_jwt_secret_at_least_32_chars");
  let app;
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    const hash = await argon2.hash("CatalogPassword123!", { type: argon2.argon2id });
    const adminResult = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash)
       VALUES ('Catalog Admin', $1, $2) RETURNING id::text`,
      [`catalog-admin-${suffix}@example.com`, hash],
    );
    const customer = await authRepository.createCustomer({
      fullName: "Catalog Customer",
      email: `catalog-customer-${suffix}@example.com`,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash: hash,
    });
    adminToken = await tokenService.signAccessToken({
      accountId: adminResult.rows[0].id,
      role: "admin",
    });
    customerToken = await tokenService.signAccessToken({ accountId: customer.id, role: "customer" });
    app = createApp({
      authRepository,
      adminCatalogRepository,
      accessTokenService: tokenService,
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("requires an admin role", async () => {
    expect((await request(app).get("/api/admin/catalog/categories")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/admin/catalog/categories")
          .set("Authorization", `Bearer ${customerToken}`)
      ).status,
    ).toBe(403);
  });

  it("creates, lists, updates and deletes every catalog resource", async () => {
    for (const resource of ["categories", "brands", "sizes", "colors"]) {
      const name = `${resource}-${suffix}`;
      const createResponse = await request(app)
        .post(`/api/admin/catalog/${resource}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name, ...(resource === "colors" ? { hexCode: "#123ABC" } : {}) });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.item.name).toBe(name);
      const id = createResponse.body.item.id;

      const listResponse = await request(app)
        .get(`/api/admin/catalog/${resource}`)
        .query({ q: name, page: "invalid" })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
      expect(listResponse.body.items).toHaveLength(1);

      const updateResponse = await request(app)
        .patch(`/api/admin/catalog/${resource}/${id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: `u-${name.slice(0, 25)}`,
          ...(resource === "colors" ? { hexCode: null } : {}),
        });
      expect(updateResponse.status).toBe(200);

      expect(
        (
          await request(app)
            .delete(`/api/admin/catalog/${resource}/${id}`)
            .set("Authorization", `Bearer ${adminToken}`)
        ).status,
      ).toBe(204);
    }
  });

  it("rejects case-insensitive duplicates", async () => {
    const name = `Duplicate-${suffix}`;
    const first = await request(app)
      .post("/api/admin/catalog/brands")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name });
    const duplicate = await request(app)
      .post("/api/admin/catalog/brands")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: name.toUpperCase() });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.fields.name).toBeTruthy();
  });

  it("blocks deleting used items and reports active and deleted product counts", async () => {
    const ids = {};
    for (const resource of ["categories", "brands", "sizes", "colors"]) {
      const response = await request(app)
        .post(`/api/admin/catalog/${resource}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `used-${resource}-${suffix}` });
      ids[resource] = response.body.item.id;
    }
    const product = await pool.query(
      `INSERT INTO products
       (category_id, brand_id, name, search_name, slug, price, deleted_at)
       VALUES ($1, $2, 'Active', 'active', $3, 1000, NULL),
              ($1, $2, 'Deleted', 'deleted', $4, 1000, now())
       RETURNING id::text`,
      [ids.categories, ids.brands, `active-${suffix}`, `deleted-${suffix}`],
    );
    await pool.query(
      `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity, deleted_at)
       VALUES ($1, $3, $4, 1, NULL), ($2, $3, $4, 0, now())`,
      [product.rows[0].id, product.rows[1].id, ids.sizes, ids.colors],
    );

    for (const resource of Object.keys(ids)) {
      const response = await request(app)
        .delete(`/api/admin/catalog/${resource}/${ids[resource]}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain("1 sản phẩm đang bán");
      expect(response.body.error.message).toContain("1 sản phẩm đã xóa mềm");
    }
  });
});
