import { z } from "zod";

const productVariantId = z
  .union([
    z.string().regex(/^[1-9][0-9]*$/, "Mã biến thể không hợp lệ."),
    z.number().int().positive().safe(),
  ])
  .transform((value) => String(value));

export const mergeCartSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productVariantId,
            quantity: z.number().int().positive().max(2147483647),
          })
          .strict(),
      )
      .min(1, "Giỏ local phải có ít nhất một dòng.")
      .max(100, "Giỏ local có quá nhiều dòng."),
  })
  .strict();
