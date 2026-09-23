import { z } from "zod";

const productVariantId = z
  .union([
    z.string().regex(/^[1-9][0-9]*$/, "Mã biến thể không hợp lệ."),
    z.number().int().positive().safe(),
  ])
  .transform((value) => String(value));

const quantity = z.number().int().positive().max(2147483647);

export const mergeCartSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productVariantId,
            quantity,
          })
          .strict(),
      )
      .min(1, "Giỏ local phải có ít nhất một dòng.")
      .max(100, "Giỏ local có quá nhiều dòng."),
  })
  .strict();

export const addCartItemSchema = z
  .object({
    productVariantId,
    quantity,
  })
  .strict();
