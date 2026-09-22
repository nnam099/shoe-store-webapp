import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createAuthenticateAccessToken } from "../../src/middlewares/authenticate.js";
import { errorHandler } from "../../src/middlewares/error-handler.js";
import { requireRole } from "../../src/middlewares/require-role.js";

function createProtectedApp({ claims, account, verifyError, repositoryError, role = "customer" } = {}) {
  const accessTokenService = {
    verifyAccessToken: verifyError
      ? vi.fn().mockRejectedValue(verifyError)
      : vi.fn().mockResolvedValue(claims ?? { accountId: "12", role: "customer" }),
  };
  const authRepository = {
    findActiveAccountById: repositoryError
      ? vi.fn().mockRejectedValue(repositoryError)
      : vi.fn().mockResolvedValue(
          account === undefined
            ? { id: "12", full_name: "Nguyễn An", email: "an@example.com", phone: "0901234567" }
            : account,
        ),
  };
  const app = express();
  app.get(
    "/protected",
    createAuthenticateAccessToken({ accessTokenService, authRepository }),
    requireRole(role),
    (httpRequest, response) => response.json(httpRequest.auth),
  );
  app.use(errorHandler);

  return { app, accessTokenService, authRepository };
}

describe("authentication and role middleware", () => {
  it("returns 401 for missing, malformed, invalid or expired tokens", async () => {
    const missing = createProtectedApp();
    expect((await request(missing.app).get("/protected")).status).toBe(401);

    const malformed = createProtectedApp();
    expect(
      (await request(malformed.app).get("/protected").set("Authorization", "Basic abc")).status,
    ).toBe(401);

    const invalid = createProtectedApp({ verifyError: new Error("expired token details") });
    const response = await request(invalid.app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(JSON.stringify(response.body)).not.toContain("expired token details");
  });

  it("returns 401 when the account no longer exists or is inactive", async () => {
    const { app } = createProtectedApp({ account: null });
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(401);
  });

  it("returns 403 for a valid token with the wrong role", async () => {
    const { app } = createProtectedApp({ role: "admin" });
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("attaches a safe authenticated account for an allowed role", async () => {
    const { app, accessTokenService, authRepository } = createProtectedApp();
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accountId: "12",
      role: "customer",
      account: {
        id: "12",
        full_name: "Nguyễn An",
        email: "an@example.com",
        phone: "0901234567",
      },
    });
    expect(response.body.account).not.toHaveProperty("password_hash");
    expect(accessTokenService.verifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(authRepository.findActiveAccountById).toHaveBeenCalledWith({
      accountId: "12",
      role: "customer",
    });
  });

  it("does not hide repository failures as authentication failures", async () => {
    const { app } = createProtectedApp({ repositoryError: new Error("database unavailable") });
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Đã xảy ra lỗi hệ thống.",
      },
    });
  });
});
