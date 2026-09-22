import { Router } from "express";

import { createHealthRouter } from "./health.routes.js";

export function createApiRouter({ healthController }) {
  const router = Router();

  router.use("/health", createHealthRouter(healthController));

  return router;
}
