import { Router } from "express";

import { createAccountRouter } from "./account.routes.js";
import { createAdminRouter } from "./admin.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createCartRouter } from "./cart.routes.js";
import { createHealthRouter } from "./health.routes.js";
import { createProductRouter } from "./product.routes.js";

export function createApiRouter({
  healthController,
  authController,
  accountController,
  adminAuthController,
  adminCatalogController,
  adminProductController,
  cartController,
  productController,
  authenticateAccessToken,
}) {
  const router = Router();

  router.use("/health", createHealthRouter(healthController));
  router.use("/products", createProductRouter(productController));
  router.use("/auth", createAuthRouter({ authController, authenticateAccessToken }));
  router.use("/account", createAccountRouter({ accountController, authenticateAccessToken }));
  router.use("/cart", createCartRouter({ cartController, authenticateAccessToken }));
  router.use(
    "/admin",
    createAdminRouter({
      adminAuthController,
      adminCatalogController,
      adminProductController,
      authenticateAccessToken,
    }),
  );

  return router;
}
