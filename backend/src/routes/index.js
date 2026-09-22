import { Router } from "express";

import { createAccountRouter } from "./account.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createCartRouter } from "./cart.routes.js";
import { createHealthRouter } from "./health.routes.js";

export function createApiRouter({
  healthController,
  authController,
  accountController,
  cartController,
  authenticateAccessToken,
}) {
  const router = Router();

  router.use("/health", createHealthRouter(healthController));
  router.use("/auth", createAuthRouter({ authController, authenticateAccessToken }));
  router.use("/account", createAccountRouter({ accountController, authenticateAccessToken }));
  router.use("/cart", createCartRouter({ cartController, authenticateAccessToken }));

  return router;
}
