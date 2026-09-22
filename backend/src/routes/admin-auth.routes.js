import { Router } from "express";

import { createLoginRateLimiter } from "../middlewares/rate-limit.js";
import { validate } from "../middlewares/validate.js";
import { adminLoginSchema } from "../schemas/auth.schemas.js";

export function createAdminAuthRouter(adminAuthController) {
  const router = Router();

  router.post(
    "/login",
    createLoginRateLimiter(),
    validate(adminLoginSchema),
    adminAuthController.login,
  );

  return router;
}
