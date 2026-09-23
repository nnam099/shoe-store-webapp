import cors from "cors";
import express from "express";
import helmet from "helmet";
import { resolve } from "node:path";

import { env } from "./config/env.js";
import { createAccountController } from "./controllers/account.controller.js";
import { createAdminAuthController } from "./controllers/admin-auth.controller.js";
import { createAdminCatalogController } from "./controllers/admin-catalog.controller.js";
import { createAdminProductController } from "./controllers/admin-product.controller.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createCartController } from "./controllers/cart.controller.js";
import { createHealthController } from "./controllers/health.controller.js";
import { createProductController } from "./controllers/product.controller.js";
import { createAuthRepository } from "./db/auth.repository.js";
import { createAccountRepository } from "./db/account.repository.js";
import { createAdminCatalogRepository } from "./db/admin-catalog.repository.js";
import { createAdminProductRepository } from "./db/admin-product.repository.js";
import { createCartRepository } from "./db/cart.repository.js";
import { createHealthRepository } from "./db/health.repository.js";
import { createProductRepository } from "./db/product.repository.js";
import { createAuthenticateAccessToken } from "./middlewares/authenticate.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { createGeneralRateLimiter } from "./middlewares/rate-limit.js";
import { createApiRouter } from "./routes/index.js";
import { createAuthService } from "./services/auth.service.js";
import { createAccountService } from "./services/account.service.js";
import { createAdminCatalogService } from "./services/admin-catalog.service.js";
import { createAdminProductService } from "./services/admin-product.service.js";
import { createCartMergeService } from "./services/cart-merge.service.js";
import { createCartItemService } from "./services/cart-item.service.js";
import { createHealthService } from "./services/health.service.js";
import { createProductService } from "./services/product.service.js";
import { tokenService } from "./utils/jwt.js";

export function createApp({
  healthRepository = createHealthRepository(),
  authRepository = createAuthRepository(),
  accountRepository = createAccountRepository(),
  adminCatalogRepository = createAdminCatalogRepository(),
  adminProductRepository = createAdminProductRepository(),
  cartRepository = createCartRepository(),
  productRepository = createProductRepository(),
  accessTokenService = tokenService,
  uploadDirectory = env.UPLOAD_DIR,
} = {}) {
  const app = express();
  const healthService = createHealthService(healthRepository);
  const healthController = createHealthController(healthService);
  const productService = createProductService(productRepository);
  const productController = createProductController(productService);
  const authService = createAuthService({ authRepository, accessTokenService });
  const accountService = createAccountService(accountRepository);
  const authController = createAuthController(authService);
  const adminAuthController = createAdminAuthController(authService);
  const adminCatalogService = createAdminCatalogService(adminCatalogRepository);
  const adminCatalogController = createAdminCatalogController(adminCatalogService);
  const adminProductService = createAdminProductService(adminProductRepository, { uploadDirectory });
  const adminProductController = createAdminProductController(adminProductService);
  const accountController = createAccountController(accountService);
  const cartMergeService = createCartMergeService(cartRepository);
  const cartItemService = createCartItemService(cartRepository);
  const cartController = createCartController(cartMergeService, cartItemService);
  const authenticateAccessToken = createAuthenticateAccessToken({
    authRepository,
    accessTokenService,
  });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(createGeneralRateLimiter());
  app.use(
    "/uploads",
    (_request, response, next) => {
      response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(resolve(uploadDirectory), {
      dotfiles: "deny",
      fallthrough: true,
      index: false,
      redirect: false,
    }),
  );
  app.use(
    "/api",
    createApiRouter({
      healthController,
      authController,
      accountController,
      adminAuthController,
      adminCatalogController,
      adminProductController,
      cartController,
      productController,
      authenticateAccessToken,
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
