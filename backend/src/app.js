import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { createHealthController } from "./controllers/health.controller.js";
import { createHealthRepository } from "./db/health.repository.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { createGeneralRateLimiter } from "./middlewares/rate-limit.js";
import { createApiRouter } from "./routes/index.js";
import { createHealthService } from "./services/health.service.js";

export function createApp({ healthRepository = createHealthRepository() } = {}) {
  const app = express();
  const healthService = createHealthService(healthRepository);
  const healthController = createHealthController(healthService);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(createGeneralRateLimiter());
  app.use("/api", createApiRouter({ healthController }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
