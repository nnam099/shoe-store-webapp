import { Router } from "express";

import { requireRole } from "../middlewares/require-role.js";
import { validate } from "../middlewares/validate.js";
import { addCartItemSchema, mergeCartSchema } from "../schemas/cart.schemas.js";

export function createCartRouter({ cartController, authenticateAccessToken }) {
  const router = Router();

  router.post(
    "/merge",
    authenticateAccessToken,
    requireRole("customer"),
    validate(mergeCartSchema),
    cartController.merge,
  );

  router.post(
    "/items",
    authenticateAccessToken,
    requireRole("customer"),
    validate(addCartItemSchema),
    cartController.addItem,
  );

  return router;
}
