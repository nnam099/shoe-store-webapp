import { Router } from "express";

import { requireRole } from "../middlewares/require-role.js";
import { createAdminAuthRouter } from "./admin-auth.routes.js";

export function createAdminRouter({ adminAuthController, authenticateAccessToken }) {
  const router = Router();

  router.use("/auth", createAdminAuthRouter(adminAuthController));
  router.use(authenticateAccessToken, requireRole("admin"));
  router.get("/", adminAuthController.index);

  return router;
}
