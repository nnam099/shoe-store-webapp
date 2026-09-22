import { afterEach, describe, expect, it, vi } from "vitest";

import { createTokenService } from "../../src/utils/jwt.js";

const secret = "unit_test_jwt_secret_at_least_32_characters";

describe("access token service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["customer", 24 * 60 * 60],
    ["admin", 8 * 60 * 60],
  ])("signs and verifies a %s token with the approved TTL", async (role, ttl) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T00:00:00.000Z"));
    const service = createTokenService(secret);
    const token = await service.signAccessToken({ accountId: "42", role });
    const claims = await service.verifyAccessToken(token);

    expect(claims).toMatchObject({ accountId: "42", role });
    expect(claims.expiresAt - claims.issuedAt).toBe(ttl);
  });

  it("rejects expired and incorrectly signed tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T00:00:00.000Z"));
    const service = createTokenService(secret);
    const token = await service.signAccessToken({ accountId: "7", role: "customer" });

    vi.setSystemTime(new Date("2026-09-23T00:00:01.000Z"));
    await expect(service.verifyAccessToken(token)).rejects.toThrow();
    await expect(createTokenService(`${secret}-other`).verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects unsupported roles and invalid account IDs", async () => {
    const service = createTokenService(secret);

    await expect(service.signAccessToken({ accountId: "1", role: "guest" })).rejects.toThrow();
    await expect(service.signAccessToken({ accountId: "0", role: "customer" })).rejects.toThrow();
  });
});
