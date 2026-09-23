import { z } from "zod";

const safePositiveInteger = z.coerce.number().int().safe().positive();

export const catalogResourceParamsSchema = z
  .object({ resource: z.enum(["categories", "brands", "sizes", "colors"]) })
  .strict();

export const catalogItemParamsSchema = z
  .object({
    resource: z.enum(["categories", "brands", "sizes", "colors"]),
    id: safePositiveInteger,
  })
  .strict();

export const catalogListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().default(""),
    sort: z.enum(["name_asc", "name_desc", "newest", "oldest"]).optional().default("name_asc"),
    page: z.coerce.number().int().positive().catch(1).default(1),
  })
  .strict();

export const catalogItemSchema = z
  .object({
    name: z.string().trim().min(1, "Tên/giá trị là bắt buộc.").max(100),
    hexCode: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? null : value),
        z.union([z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Mã màu phải có dạng #RRGGBB."), z.null()]),
      )
      .optional()
      .default(null),
  })
  .strict();
