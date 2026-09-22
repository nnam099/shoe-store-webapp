import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { createAccountController } from "./controllers/account.controller.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createCartController } from "./controllers/cart.controller.js";
import { createHealthController } from "./controllers/health.controller.js";
import { createAuthRepository } from "./db/auth.repository.js";
import { createAccountRepository } from "./db/account.repository.js";
import { createCartRepository } from "./db/cart.repository.js";
import { createHealthRepository } from "./db/health.repository.js";
import { createAuthenticateAccessToken } from "./middlewares/authenticate.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { createGeneralRateLimiter } from "./middlewares/rate-limit.js";
import { createApiRouter } from "./routes/index.js";
import { createAuthService } from "./services/auth.service.js";
import { createAccountService } from "./services/account.service.js";
import { createCartMergeService } from "./services/cart-merge.service.js";
import { createHealthService } from "./services/health.service.js";
import { tokenService } from "./utils/jwt.js";

export function createApp({
  healthRepository = createHealthRepository(),
  authRepository = createAuthRepository(),
  accountRepository = createAccountRepository(),
  cartRepository = createCartRepository(),
  accessTokenService = tokenService,
} = {}) {
  const app = express();
  const healthService = createHealthService(healthRepository);
  const healthController = createHealthController(healthService);
  const authService = createAuthService({ authRepository, accessTokenService });
  const accountService = createAccountService(accountRepository);
  const authController = createAuthController(authService);
  const accountController = createAccountController(accountService);
  const cartMergeService = createCartMergeService(cartRepository);
  const cartController = createCartController(cartMergeService);
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
    "/api",
    createApiRouter({
      healthController,
      authController,
      accountController,
      cartController,
      authenticateAccessToken,
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
