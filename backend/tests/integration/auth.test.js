import argon2 from "argon2";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { createAuthRepository } from "../../src/db/auth.repository.js";
import { createHealthRepository } from "../../src/db/health.repository.js";
import { createTokenService } from "../../src/utils/jwt.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const fixtureSuffix = `${process.pid}-${Date.now()}`;
const jwtSecret = "integration_test_jwt_secret_at_least_32_chars";

describeDatabase("customer authentication API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const accessTokenService = createTokenService(jwtSecret);
  const customer = {
    fullName: "Khách Xác Thực",
    email: `auth-${fixtureSuffix}@example.com`,
    phone: `09${String(Date.now()).slice(-8)}`,
    password: "Customer123!",
  };
  let app;
  let customerId;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(customer.password, { type: argon2.argon2id });
    const inserted = await authRepository.createCustomer({
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      passwordHash,
    });
    customerId = inserted.id;
  });

  beforeEach(() => {
    app = createApp({
      authRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("registers a normalized customer with an Argon2id hash and no token", async () => {
    const email = `REGISTER-${fixtureSuffix}@EXAMPLE.COM`;
    const phone = `08${String(Date.now() + 1).slice(-8)}`;
    const response = await request(app).post("/api/auth/register").send({
      fullName: "  Người Đăng Ký  ",
      email,
      phone,
      password: "Register123!",
      passwordConfirmation: "Register123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.account).toMatchObject({
      role: "customer",
      fullName: "Người Đăng Ký",
      email: email.trim().toLowerCase(),
      phone,
    });
    expect(response.body).not.toHaveProperty("accessToken");
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash/i);

    const stored = await pool.query(
      "SELECT password_hash FROM customers WHERE email = $1",
      [email.toLowerCase()],
    );
    expect(stored.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    await expect(argon2.verify(stored.rows[0].password_hash, "Register123!")).resolves.toBe(true);
  });

  it("returns field-specific conflicts for duplicate email and phone", async () => {
    const duplicateEmail = await request(app).post("/api/auth/register").send({
      fullName: "Trùng Email",
      email: customer.email.toUpperCase(),
      phone: `07${String(Date.now() + 2).slice(-8)}`,
      password: "Register123!",
      passwordConfirmation: "Register123!",
    });
    expect(duplicateEmail.status).toBe(409);
    expect(duplicateEmail.body.error.fields).toHaveProperty("email");

    app = createApp({
      authRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const duplicatePhone = await request(app).post("/api/auth/register").send({
      fullName: "Trùng Phone",
      email: `other-${fixtureSuffix}@example.com`,
      phone: customer.phone,
      password: "Register123!",
      passwordConfirmation: "Register123!",
    });
    expect(duplicatePhone.status).toBe(409);
    expect(duplicatePhone.body.error.fields).toHaveProperty("phone");
  });

  it("lets the database resolve concurrent registration for the same email", async () => {
    const email = `race-${fixtureSuffix}@example.com`;
    const baseRequest = {
      fullName: "Đăng Ký Đồng Thời",
      email,
      password: "Register123!",
      passwordConfirmation: "Register123!",
    };
    const [first, second] = await Promise.all([
      request(app)
        .post("/api/auth/register")
        .send({ ...baseRequest, phone: `06${String(Date.now() + 3).slice(-8)}` }),
      request(app)
        .post("/api/auth/register")
        .send({ ...baseRequest, phone: `05${String(Date.now() + 4).slice(-8)}` }),
    ]);
    const responses = [first, second].sort((left, right) => left.status - right.status);

    expect(responses.map((response) => response.status)).toEqual([201, 409]);
    expect(responses[1].body.error.fields).toHaveProperty("email");
  });

  it.each(["email", "phone"])("logs in with customer %s and returns a 24-hour token", async (key) => {
    const response = await request(app).post("/api/auth/login").send({
      identifier: key === "email" ? customer.email.toUpperCase() : customer.phone,
      password: customer.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.account).toMatchObject({ id: customerId, role: "customer" });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash/i);

    const claims = await accessTokenService.verifyAccessToken(response.body.accessToken);
    expect(claims).toMatchObject({ accountId: customerId, role: "customer" });
    expect(claims.expiresAt - claims.issuedAt).toBe(24 * 60 * 60);
  });

  it("uses the same error for an unknown account and a wrong password", async () => {
    const unknown = await request(app).post("/api/auth/login").send({
      identifier: `unknown-${fixtureSuffix}@example.com`,
      password: "WrongPassword!",
    });
    app = createApp({
      authRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const wrongPassword = await request(app).post("/api/auth/login").send({
      identifier: customer.email,
      password: "WrongPassword!",
    });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
    expect(unknown.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Sai tài khoản hoặc mật khẩu.",
    });
  });

  it("restores a safe session from a valid Bearer token", async () => {
    const accessToken = await accessTokenService.signAccessToken({
      accountId: customerId,
      role: "customer",
    });
    const response = await request(app)
      .get("/api/auth/session")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.account).toEqual({
      id: customerId,
      role: "customer",
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash/i);
  });
});
