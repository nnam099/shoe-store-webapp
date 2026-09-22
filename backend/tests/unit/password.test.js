import argon2 from "argon2";
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../src/utils/password.js";

describe("password utilities", () => {
  it("hashes with Argon2id and verifies without exposing plain text", async () => {
    const passwordHash = await hashPassword("password123");

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, "password123")).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "wrong-password")).resolves.toBe(false);
    expect(passwordHash).not.toContain("password123");
    expect(argon2.needsRehash(passwordHash)).toBe(false);
  });
});
