import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAccountRepository } from "../../src/db/account.repository.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createCartRepository } from "../../src/db/cart.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createTokenService } from "../../src/utils/jwt.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const fixtureSuffix = `${process.pid}-${Date.now()}`;

describeDatabase("admin authentication API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const accountRepository = createAccountRepository(pool);
  const cartRepository = createCartRepository(pool);
  const accessTokenService = createTokenService("admin_test_jwt_secret_at_least_32_characters");
  const adminPassword = "AdminPassword123!";
  const customerPassword = "CustomerPassword123!";
  let app;
  let customerId;
  let customerToken;
  let deletedAdminId;
  const admins = [];

  beforeAll(async () => {
    const [adminHash, customerHash] = await Promise.all([
      argon2.hash(adminPassword, { type: argon2.argon2id }),
      argon2.hash(customerPassword, { type: argon2.argon2id }),
    ]);
    const sharedEmail = `shared-${fixtureSuffix}@example.com`;
    const customer = await authRepository.createCustomer({
      fullName: "Customer Chung Email",
      email: sharedEmail,
      phone: `02${String(Date.now()).slice(-8)}`,
      passwordHash: customerHash,
    });
    customerId = customer.id;
    customerToken = await accessTokenService.signAccessToken({
      accountId: customerId,
      role: "customer",
    });

    for (const [index, email] of [
      sharedEmail,
      `admin-two-${fixtureSuffix}@example.com`,
    ].entries()) {
      const result = await pool.query(
        `INSERT INTO admin_accounts (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id::text, full_name, email`,
        [`Admin ${index + 1}`, email, adminHash],
      );
      admins.push(result.rows[0]);
    }

    const deleted = await pool.query(
      `INSERT INTO admin_accounts (full_name, email, password_hash, deleted_at)
       VALUES ($1, $2, $3, now())
       RETURNING id::text`,
      ["Admin Đã Xóa", `deleted-${fixtureSuffix}@example.com`, adminHash],
    );
    deletedAdminId = deleted.rows[0].id;
  });

  beforeEach(() => {
    app = createApp({
      authRepository,
      accountRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it.each([0, 1])("logs in active admin %s with the same role and an 8-hour token", async (index) => {
    const response = await request(app).post("/api/admin/auth/login").send({
      email: admins[index].email.toUpperCase(),
      password: adminPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.account).toEqual({
      id: admins[index].id,
      role: "admin",
      fullName: admins[index].full_name,
      email: admins[index].email,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash/i);
    const claims = await accessTokenService.verifyAccessToken(response.body.accessToken);
    expect(claims.role).toBe("admin");
    expect(claims.expiresAt - claims.issuedAt).toBe(8 * 60 * 60);
  });

  it("keeps Customer and Admin credentials separate even when their email matches", async () => {
    const adminEndpoint = await request(app).post("/api/admin/auth/login").send({
      email: admins[0].email,
      password: customerPassword,
    });
    expect(adminEndpoint.status).toBe(401);

    app = createApp({
      authRepository,
      accountRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const customerEndpoint = await request(app).post("/api/auth/login").send({
      identifier: admins[0].email,
      password: customerPassword,
    });
    expect(customerEndpoint.status).toBe(200);
    expect(customerEndpoint.body.account.role).toBe("customer");
  });

  it("uses the same error for unknown, wrong-password and deleted Admin accounts", async () => {
    const requests = [
      { email: `unknown-${fixtureSuffix}@example.com`, password: adminPassword },
      { email: admins[0].email, password: "WrongPassword!" },
      { email: `deleted-${fixtureSuffix}@example.com`, password: adminPassword },
    ];
    const responses = [];

    for (const body of requests) {
      app = createApp({
        authRepository,
        accountRepository,
        cartRepository,
        accessTokenService,
        healthRepository: createHealthRepository(pool),
      });
      responses.push(await request(app).post("/api/admin/auth/login").send(body));
    }

    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(responses[0].body).toEqual(responses[1].body);
    expect(responses[1].body).toEqual(responses[2].body);
    expect(responses[0].body.error.message).toBe("Sai tài khoản hoặc mật khẩu.");
  });

  it("protects the Admin namespace in the backend", async () => {
    const adminToken = await accessTokenService.signAccessToken({
      accountId: admins[0].id,
      role: "admin",
    });
    const allowed = await request(app)
      .get("/api/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.account.role).toBe("admin");

    const customerDenied = await request(app)
      .get("/api/admin")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(customerDenied.status).toBe(403);
    expect((await request(app).get("/api/admin")).status).toBe(401);
  });

  it("rejects an already-issued token after the Admin is soft-deleted", async () => {
    const deletedToken = await accessTokenService.signAccessToken({
      accountId: deletedAdminId,
      role: "admin",
    });
    const response = await request(app)
      .get("/api/admin")
      .set("Authorization", `Bearer ${deletedToken}`);

    expect(response.status).toBe(401);
  });
});
