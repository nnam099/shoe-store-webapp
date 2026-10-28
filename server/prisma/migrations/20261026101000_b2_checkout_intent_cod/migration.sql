CREATE TYPE "CheckoutIntentStatus" AS ENUM (
  'OPEN',
  'EMAIL_VERIFIED',
  'COMPLETED',
  'EXPIRED'
);

CREATE TABLE "checkout_intents" (
  "id" UUID NOT NULL,
  "user_id" INTEGER,
  "guest_token_hash" CHAR(64),
  "email" VARCHAR(150) NOT NULL,
  "receiver_name" VARCHAR(100) NOT NULL,
  "receiver_phone" VARCHAR(20) NOT NULL,
  "receiver_address" TEXT NOT NULL,
  "note" TEXT,
  "items_snapshot" JSONB NOT NULL,
  "quote_snapshot" JSONB NOT NULL,
  "quoted_subtotal" DECIMAL(12,0) NOT NULL,
  "quoted_shipping_fee" DECIMAL(12,0) NOT NULL,
  "quoted_total" DECIMAL(12,0) NOT NULL,
  "quote_version" INTEGER NOT NULL DEFAULT 1,
  "status" "CheckoutIntentStatus" NOT NULL DEFAULT 'OPEN',
  "verified_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checkout_intents_actor_check" CHECK (
    ("user_id" IS NOT NULL AND "guest_token_hash" IS NULL)
    OR ("user_id" IS NULL AND "guest_token_hash" IS NOT NULL)
  ),
  CONSTRAINT "checkout_intents_quote_version_check" CHECK ("quote_version" > 0)
);

CREATE UNIQUE INDEX "checkout_intents_guest_token_hash_key"
  ON "checkout_intents"("guest_token_hash");
CREATE INDEX "checkout_intents_user_id_status_idx"
  ON "checkout_intents"("user_id", "status");
CREATE INDEX "checkout_intents_email_created_at_idx"
  ON "checkout_intents"("email", "created_at");
CREATE INDEX "checkout_intents_status_expires_at_idx"
  ON "checkout_intents"("status", "expires_at");

ALTER TABLE "checkout_intents"
  ADD CONSTRAINT "checkout_intents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD COLUMN "checkout_intent_id" UUID,
  ADD COLUMN "checkout_email" VARCHAR(150);

CREATE UNIQUE INDEX "orders_checkout_intent_id_key"
  ON "orders"("checkout_intent_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_checkout_intent_id_fkey"
  FOREIGN KEY ("checkout_intent_id") REFERENCES "checkout_intents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
