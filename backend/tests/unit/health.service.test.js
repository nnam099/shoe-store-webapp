import { describe, expect, it, vi } from "vitest";

import {
  ServiceUnavailableError,
  createHealthService,
} from "../../src/services/health.service.js";

describe("health service", () => {
  it("returns a healthy response when PostgreSQL and pg_trgm are ready", async () => {
    const repository = {
      checkDatabase: vi.fn().mockResolvedValue({ pgTrgmAvailable: true }),
    };
    const service = createHealthService(repository);

    await expect(service.getHealth()).resolves.toEqual({
      status: "ok",
      database: "ok",
    });
  });

  it("hides database errors behind a service error", async () => {
    const repository = {
      checkDatabase: vi.fn().mockRejectedValue(new Error("connection string details")),
    };
    const service = createHealthService(repository);

    await expect(service.getHealth()).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
