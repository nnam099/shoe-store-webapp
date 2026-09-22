import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";

describe("GET /api/health", () => {
  it("returns 200 without exposing internal database details", async () => {
    const app = createApp({
      healthRepository: {
        checkDatabase: vi.fn().mockResolvedValue({ pgTrgmAvailable: true }),
      },
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "ok" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns a normalized 503 response when the database is unavailable", async () => {
    const app = createApp({
      healthRepository: {
        checkDatabase: vi.fn().mockRejectedValue(new Error("secret database error")),
      },
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Dịch vụ tạm thời không khả dụng.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret database error");
  });
});
