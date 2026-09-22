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

describeDatabase("customer account API", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const authRepository = createAuthRepository(pool);
  const accountRepository = createAccountRepository(pool);
  const cartRepository = createCartRepository(pool);
  const accessTokenService = createTokenService("account_test_jwt_secret_at_least_32_chars");
  const currentPassword = "CurrentPassword123!";
  const newPassword = "NewPassword123!";
  let app;
  let accountId;
  let otherAccountId;
  let token;
  let email;
  let phone;
  let otherPhone;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(currentPassword, { type: argon2.argon2id });
    email = `account-${fixtureSuffix}@example.com`;
    phone = `02${String(Date.now()).slice(-8)}`;
    otherPhone = `03${String(Date.now() + 1).slice(-8)}`;
    const account = await authRepository.createCustomer({
      fullName: "Khách Hồ Sơ",
      email,
      phone,
      passwordHash,
    });
    const other = await authRepository.createCustomer({
      fullName: "Khách Khác",
      email: `other-account-${fixtureSuffix}@example.com`,
      phone: otherPhone,
      passwordHash,
    });
    accountId = account.id;
    otherAccountId = other.id;
    token = await accessTokenService.signAccessToken({ accountId, role: "customer" });
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

  it("returns only the authenticated customer's safe profile", async () => {
    const response = await request(app)
      .get("/api/account/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.account).toEqual({
      id: accountId,
      role: "customer",
      fullName: "Khách Hồ Sơ",
      email,
      phone,
      defaultAddress: null,
    });
    expect(response.body.account.id).not.toBe(otherAccountId);
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash/i);
  });

  it("updates name, phone and a complete default address without allowing email", async () => {
    const updatedPhone = `04${String(Date.now() + 2).slice(-8)}`;
    const response = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "  Khách Đã Sửa  ",
        phone: updatedPhone,
        defaultAddress: {
          province: "Hà Nội",
          district: "Ba Đình",
          ward: "Phúc Xá",
          addressLine: "Số 1 phố Mẫu",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.account).toMatchObject({
      id: accountId,
      fullName: "Khách Đã Sửa",
      email,
      phone: updatedPhone,
      defaultAddress: { province: "Hà Nội", district: "Ba Đình" },
    });
    phone = updatedPhone;

    const emailAttempt = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "changed@example.com" });
    expect(emailAttempt.status).toBe(400);
  });

  it("rejects a partial address and another customer's phone", async () => {
    const partialAddress = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultAddress: { province: "Hà Nội" } });
    expect(partialAddress.status).toBe(400);

    app = createApp({
      authRepository,
      accountRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const duplicatePhone = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: otherPhone });
    expect(duplicatePhone.status).toBe(409);
    expect(duplicatePhone.body.error.fields).toHaveProperty("phone");
  });

  it("clears all default address fields together", async () => {
    const response = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultAddress: null });

    expect(response.status).toBe(200);
    expect(response.body.account.defaultAddress).toBeNull();
  });

  it("requires the current password and keeps the existing token valid after change", async () => {
    const incorrect = await request(app)
      .put("/api/account/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "WrongPassword!",
        newPassword,
        newPasswordConfirmation: newPassword,
      });
    expect(incorrect.status).toBe(400);
    expect(incorrect.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");

    const changed = await request(app)
      .put("/api/account/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword, newPassword, newPasswordConfirmation: newPassword });
    expect(changed.status).toBe(200);

    const stillAuthenticated = await request(app)
      .get("/api/auth/session")
      .set("Authorization", `Bearer ${token}`);
    expect(stillAuthenticated.status).toBe(200);

    app = createApp({
      authRepository,
      accountRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ identifier: email, password: currentPassword });
    expect(oldLogin.status).toBe(401);

    app = createApp({
      authRepository,
      accountRepository,
      cartRepository,
      accessTokenService,
      healthRepository: createHealthRepository(pool),
    });
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ identifier: email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });
});
