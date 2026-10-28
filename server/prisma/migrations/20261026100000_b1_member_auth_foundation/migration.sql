-- B1 Member authentication foundation. This migration is additive except for
-- relaxing password/phone nullability for Google-only Member accounts.
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ALTER COLUMN "phone" DROP NOT NULL,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

CREATE TABLE "external_identities" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "provider_subject" VARCHAR(255) NOT NULL,
  "provider_email" VARCHAR(150),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_identities_provider_provider_subject_key"
  ON "external_identities"("provider", "provider_subject");
CREATE UNIQUE INDEX "external_identities_user_id_provider_key"
  ON "external_identities"("user_id", "provider");

ALTER TABLE "external_identities"
  ADD CONSTRAINT "external_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" INTEGER NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx"
  ON "password_reset_tokens"("user_id", "expires_at");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
