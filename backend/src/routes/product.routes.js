import { Router } from "express";

import { validate } from "../middlewares/validate.js";
import { productListQuerySchema, productSlugParamsSchema } from "../schemas/product.schemas.js";

export function createProductRouter(controller) {
  const router = Router();

  router.get("/", validate(productListQuerySchema, "query"), controller.list);
  router.get("/options", controller.options);
  router.get("/:slug", validate(productSlugParamsSchema, "params"), controller.detail);

  return router;
}
