import { Router } from "express";

import { uploadProductImages } from "../middlewares/upload-product-images.js";
import { validate } from "../middlewares/validate.js";
import { validateProductMultipart } from "../middlewares/validate-product-multipart.js";
import {
  productIdParamsSchema,
  productListQuerySchema,
  productVariantInputSchema,
  imageParamsSchema,
  reorderImagesSchema,
  updateProductSchema,
  updateVariantSchema,
  variantParamsSchema,
} from "../schemas/admin-product.schemas.js";

export function createAdminProductRouter(controller) {
  const router = Router();

  router.get("/", validate(productListQuerySchema, "query"), controller.list);
  router.get("/options", controller.options);
  router.post("/", uploadProductImages, validateProductMultipart, controller.create);
  router.post(
    "/:productId/images",
    validate(productIdParamsSchema, "params"),
    uploadProductImages,
    controller.addImages,
  );
  router.put(
    "/:productId/images/order",
    validate(productIdParamsSchema, "params"),
    validate(reorderImagesSchema),
    controller.reorderImages,
  );
  router.delete(
    "/:productId/images/:imageId",
    validate(imageParamsSchema, "params"),
    controller.removeImage,
  );
  router.post(
    "/:productId/variants",
    validate(productIdParamsSchema, "params"),
    validate(productVariantInputSchema),
    controller.addVariant,
  );
  router.patch(
    "/:productId/variants/:variantId",
    validate(variantParamsSchema, "params"),
    validate(updateVariantSchema),
    controller.updateVariant,
  );
  router.delete(
    "/:productId/variants/:variantId",
    validate(variantParamsSchema, "params"),
    controller.removeVariant,
  );
  router.get("/:productId", validate(productIdParamsSchema, "params"), controller.detail);
  router.patch(
    "/:productId",
    validate(productIdParamsSchema, "params"),
    validate(updateProductSchema),
    controller.update,
  );
  router.delete("/:productId", validate(productIdParamsSchema, "params"), controller.delete);

  return router;
}
