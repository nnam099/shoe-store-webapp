import { z } from "zod";

const safePositiveInteger = z.coerce.number().int().safe().positive();
const safeNonnegativeInteger = z.coerce.number().int().safe().nonnegative();
const optionalText = (maximum) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.union([z.string().trim().max(maximum), z.null()]),
  );

export const productIdParamsSchema = z.object({ productId: safePositiveInteger }).strict();
export const imageParamsSchema = z
  .object({ productId: safePositiveInteger, imageId: safePositiveInteger })
  .strict();
export const variantParamsSchema = z
  .object({ productId: safePositiveInteger, variantId: safePositiveInteger })
  .strict();

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional().default(""),
    categoryId: safePositiveInteger.optional(),
    brandId: safePositiveInteger.optional(),
    sort: z
      .enum(["newest", "oldest", "name_asc", "name_desc", "price_asc", "price_desc"])
      .optional()
      .default("newest"),
    page: z.coerce.number().int().positive().catch(1).default(1),
  })
  .strict();

export const productVariantInputSchema = z
  .object({
    sizeId: safePositiveInteger,
    colorId: safePositiveInteger,
    stockQuantity: safeNonnegativeInteger,
  })
  .strict();

const productCoreShape = {
  name: z.string().trim().min(1, "Tên sản phẩm là bắt buộc.").max(200),
  description: optionalText(5000),
  material: optionalText(200),
  categoryId: safePositiveInteger,
  brandId: safePositiveInteger,
  price: safePositiveInteger,
  salePrice: z.union([safePositiveInteger, z.null()]),
  badgeLabel: z.enum(["new", "bestseller", "featured"]).nullable(),
};

function validateSalePrice(value, context) {
  if (value.salePrice !== null && value.salePrice >= value.price) {
    context.addIssue({
      code: "custom",
      path: ["salePrice"],
      message: "Giá khuyến mãi phải nhỏ hơn giá bán.",
    });
  }
}

export const createProductSchema = z
  .object({
    ...productCoreShape,
    description: optionalText(5000).optional().default(null),
    material: optionalText(200).optional().default(null),
    salePrice: z.union([safePositiveInteger, z.null()]).optional().default(null),
    badgeLabel: z.enum(["new", "bestseller", "featured"]).nullable().optional().default(null),
    variants: z.array(productVariantInputSchema).min(1, "Sản phẩm phải có ít nhất một biến thể."),
  })
  .strict()
  .superRefine((value, context) => {
    validateSalePrice(value, context);
    const seen = new Set();

    value.variants.forEach((variant, index) => {
      const key = `${variant.sizeId}:${variant.colorId}`;
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["variants", index],
          message: "Cặp size và màu không được trùng trong cùng sản phẩm.",
        });
      }
      seen.add(key);
    });
  });

export const updateProductSchema = z
  .object(productCoreShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần cung cấp ít nhất một trường để cập nhật.",
  })
  .superRefine((value, context) => {
    if (value.price !== undefined && value.salePrice !== undefined) {
      validateSalePrice(value, context);
    }
  });

export const reorderImagesSchema = z
  .object({ imageIds: z.array(safePositiveInteger).min(1).max(8) })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.imageIds).size !== value.imageIds.length) {
      context.addIssue({ code: "custom", path: ["imageIds"], message: "Danh sách ảnh bị trùng." });
    }
  });

export const updateVariantSchema = z.object({ stockQuantity: safeNonnegativeInteger }).strict();

export function parseMultipartProductData(value) {
  if (typeof value !== "string") {
    return { success: false, error: "Thiếu dữ liệu sản phẩm." };
  }

  try {
    return { success: true, value: JSON.parse(value) };
  } catch {
    return { success: false, error: "Dữ liệu sản phẩm phải là JSON hợp lệ." };
  }
}
