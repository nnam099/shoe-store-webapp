import { Router } from "express";

import { requireRole } from "../middlewares/require-role.js";
import { createAdminAuthRouter } from "./admin-auth.routes.js";
import { createAdminCatalogRouter } from "./admin-catalog.routes.js";
import { createAdminProductRouter } from "./admin-product.routes.js";

export function createAdminRouter({
  adminAuthController,
  adminCatalogController,
  adminProductController,
  authenticateAccessToken,
}) {
  const router = Router();

  router.use("/auth", createAdminAuthRouter(adminAuthController));
  router.use(authenticateAccessToken, requireRole("admin"));
  router.get("/", adminAuthController.index);
  router.use("/catalog", createAdminCatalogRouter(adminCatalogController));
  router.use("/products", createAdminProductRouter(adminProductController));

  return router;
}
