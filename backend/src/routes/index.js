import { Router } from "express";

import { createAuthRouter } from "./auth.routes.js";
import { createCartRouter } from "./cart.routes.js";
import { createHealthRouter } from "./health.routes.js";

export function createApiRouter({
  healthController,
  authController,
  cartController,
  authenticateAccessToken,
}) {
  const router = Router();

  router.use("/health", createHealthRouter(healthController));
  router.use("/auth", createAuthRouter({ authController, authenticateAccessToken }));
  router.use("/cart", createCartRouter({ cartController, authenticateAccessToken }));

  return router;
}
