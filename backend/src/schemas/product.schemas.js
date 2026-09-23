import { z } from "zod";

const positiveId = z
  .union([
    z.string().regex(/^[1-9][0-9]*$/, "Mã bộ lọc không hợp lệ."),
    z.number().int().positive().safe(),
  ])
  .transform(String);

const repeatedIds = z
  .preprocess((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]), z.array(positiveId).max(50))
  .transform((values) => [...new Set(values)]);

const optionalMoney = z.preprocess(
  (value) => (value === undefined || value === "" ? undefined : value),
  z.coerce.number().int().safe().nonnegative().optional(),
);

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional().default(""),
    brandId: repeatedIds,
    categoryId: repeatedIds,
    sizeId: repeatedIds,
    colorId: repeatedIds,
    minPrice: optionalMoney,
    maxPrice: optionalMoney,
    sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).optional().default("newest"),
    page: z.coerce.number().int().positive().catch(1).default(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.",
      });
    }
  });

export const productSlugParamsSchema = z
  .object({
    slug: z.string().min(1).max(240).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sản phẩm không hợp lệ."),
  })
  .strict();
