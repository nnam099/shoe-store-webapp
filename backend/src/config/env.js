import { z } from "zod";

const booleanFromString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.toLowerCase() === "true") {
    return true;
  }

  if (value.toLowerCase() === "false") {
    return false;
  }

  return value;
}, z.boolean());

const positiveInteger = (defaultValue) =>
  z.coerce.number().int().positive().default(defaultValue);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://shoe_store:dev_only_change_me@localhost:5432/shoe_store"),
  TEST_DATABASE_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  SHIPPING_FEE_VND: z.coerce.number().int().nonnegative().default(30000),
  RUN_SEED: booleanFromString.default(true),
  ADMIN_SEED_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_SEED_PASSWORD: z.string().min(8).default("development_only_password"),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  RATE_LIMIT_WINDOW_MS: positiveInteger(60000),
  RATE_LIMIT_LOGIN_MAX: positiveInteger(5),
  RATE_LIMIT_REGISTER_MAX: positiveInteger(5),
  RATE_LIMIT_GUEST_ORDER_LOOKUP_MAX: positiveInteger(10),
  RATE_LIMIT_CREATE_ORDER_MAX: positiveInteger(10),
  RATE_LIMIT_GENERAL_MAX: positiveInteger(120),
});

export function parseEnv(source) {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
