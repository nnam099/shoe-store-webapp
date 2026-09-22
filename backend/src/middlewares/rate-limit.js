import { rateLimit } from "express-rate-limit";

import { env } from "../config/env.js";

function createRateLimiter(limit) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
        },
      });
    },
  });
}

export function createGeneralRateLimiter(limit = env.RATE_LIMIT_GENERAL_MAX) {
  return createRateLimiter(limit);
}

export function createLoginRateLimiter(limit = env.RATE_LIMIT_LOGIN_MAX) {
  return createRateLimiter(limit);
}

export function createRegisterRateLimiter(limit = env.RATE_LIMIT_REGISTER_MAX) {
  return createRateLimiter(limit);
}
