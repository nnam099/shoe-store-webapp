import { describe, expect, it } from "vitest";

import { parseEnv } from "../../src/config/env.js";

describe("parseEnv", () => {
  it("uses safe development defaults", () => {
    const result = parseEnv({});

    expect(result.BACKEND_PORT).toBe(3000);
    expect(result.SHIPPING_FEE_VND).toBe(30000);
    expect(result.RUN_SEED).toBe(true);
    expect(result.RATE_LIMIT_GENERAL_MAX).toBe(120);
    expect(result.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("coerces supported environment values", () => {
    const result = parseEnv({
      BACKEND_PORT: "3100",
      RUN_SEED: "false",
      RATE_LIMIT_GENERAL_MAX: "42",
    });

    expect(result.BACKEND_PORT).toBe(3100);
    expect(result.RUN_SEED).toBe(false);
    expect(result.RATE_LIMIT_GENERAL_MAX).toBe(42);
  });

  it("rejects invalid configuration", () => {
    expect(() =>
      parseEnv({
        BACKEND_PORT: "70000",
      }),
    ).toThrow();

    expect(() => parseEnv({ JWT_SECRET: "too-short" })).toThrow();
  });
});
