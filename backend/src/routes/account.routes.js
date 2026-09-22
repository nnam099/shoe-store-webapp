import { Router } from "express";

import { requireRole } from "../middlewares/require-role.js";
import { validate } from "../middlewares/validate.js";
import { changePasswordSchema, updateProfileSchema } from "../schemas/account.schemas.js";

export function createAccountRouter({ accountController, authenticateAccessToken }) {
  const router = Router();

  router.use(authenticateAccessToken, requireRole("customer"));
  router.get("/profile", accountController.getProfile);
  router.patch("/profile", validate(updateProfileSchema), accountController.updateProfile);
  router.put("/password", validate(changePasswordSchema), accountController.changePassword);

  return router;
}
