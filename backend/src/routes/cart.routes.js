import { Router } from "express";

import { requireRole } from "../middlewares/require-role.js";
import { validate } from "../middlewares/validate.js";
import {
  addCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  updateCartItemSchema,
  validateCartSchema,
} from "../schemas/cart.schemas.js";

export function createCartRouter({ cartController, authenticateAccessToken }) {
  const router = Router();

  router.post("/validate", validate(validateCartSchema), cartController.validate);

  router.get(
    "/",
    authenticateAccessToken,
    requireRole("customer"),
    cartController.get,
  );

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

  router.patch(
    "/items/:productVariantId",
    authenticateAccessToken,
    requireRole("customer"),
    validate(cartItemParamsSchema, "params"),
    validate(updateCartItemSchema),
    cartController.updateItem,
  );

  router.delete(
    "/items/:productVariantId",
    authenticateAccessToken,
    requireRole("customer"),
    validate(cartItemParamsSchema, "params"),
    cartController.deleteItem,
  );

  return router;
}
