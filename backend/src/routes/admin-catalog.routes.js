import { Router } from "express";

import { validate } from "../middlewares/validate.js";
import {
  catalogItemParamsSchema,
  catalogItemSchema,
  catalogListQuerySchema,
  catalogResourceParamsSchema,
} from "../schemas/admin-catalog.schemas.js";

export function createAdminCatalogRouter(controller) {
  const router = Router({ mergeParams: true });

  router.get(
    "/:resource",
    validate(catalogResourceParamsSchema, "params"),
    validate(catalogListQuerySchema, "query"),
    controller.list,
  );
  router.post(
    "/:resource",
    validate(catalogResourceParamsSchema, "params"),
    validate(catalogItemSchema),
    controller.create,
  );
  router.patch(
    "/:resource/:id",
    validate(catalogItemParamsSchema, "params"),
    validate(catalogItemSchema),
    controller.update,
  );
  router.delete(
    "/:resource/:id",
    validate(catalogItemParamsSchema, "params"),
    controller.delete,
  );

  return router;
}
