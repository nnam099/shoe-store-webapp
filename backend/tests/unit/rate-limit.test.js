import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  createLoginRateLimiter,
  createRegisterRateLimiter,
} from "../../src/middlewares/rate-limit.js";

function createLimitedApp(path, limiter) {
  const app = express();
  app.post(path, limiter, (_httpRequest, response) => response.status(204).end());
  return app;
}

describe("authentication rate limiters", () => {
  it.each([
    ["login", createLoginRateLimiter],
    ["register", createRegisterRateLimiter],
  ])("returns a normalized 429 response for %s", async (name, createLimiter) => {
    const path = `/${name}`;
    const app = createLimitedApp(path, createLimiter(1));

    expect((await request(app).post(path)).status).toBe(204);
    const blocked = await request(app).post(path);

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      },
    });
  });
});
