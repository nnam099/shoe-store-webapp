import { Router } from "express";

import { createAuthRouter } from "./auth.routes.js";
import { createHealthRouter } from "./health.routes.js";

export function createApiRouter({ healthController, authController, authenticateAccessToken }) {
  const router = Router();

  router.use("/health", createHealthRouter(healthController));
  router.use("/auth", createAuthRouter({ authController, authenticateAccessToken }));

  return router;
}
