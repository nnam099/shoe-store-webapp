import { Router } from "express";

import {
  createLoginRateLimiter,
  createRegisterRateLimiter,
} from "../middlewares/rate-limit.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schemas.js";

export function createAuthRouter({ authController, authenticateAccessToken }) {
  const router = Router();

  router.post(
    "/register",
    createRegisterRateLimiter(),
    validate(registerSchema),
    authController.register,
  );
  router.post("/login", createLoginRateLimiter(), validate(loginSchema), authController.login);
  router.get("/session", authenticateAccessToken, authController.session);

  return router;
}
