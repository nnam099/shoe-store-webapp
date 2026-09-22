import { rateLimit } from "express-rate-limit";

import { env } from "../config/env.js";

export function createGeneralRateLimiter() {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_GENERAL_MAX,
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
