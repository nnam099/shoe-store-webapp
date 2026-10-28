CREATE TYPE "EmailChallengePurpose" AS ENUM ('CHECKOUT', 'PASSWORD_SETUP');
CREATE TYPE "EmailOutboxStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'RETRY',
  'SENT',
  'FAILED'
);
CREATE TYPE "EmailTemplate" AS ENUM ('PASSWORD_CHANGED', 'ORDER_CREATED');

CREATE TABLE "email_challenges" (
  "id" UUID NOT NULL,
  "purpose" "EmailChallengePurpose" NOT NULL,
  "checkout_intent_id" UUID,
  "user_id" INTEGER,
  "email" VARCHAR(150) NOT NULL,
  "code_hash" CHAR(64) NOT NULL,
  "attempts_remaining" INTEGER NOT NULL DEFAULT 5,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "resend_available_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "invalidated_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_challenges_attempts_check"
    CHECK ("attempts_remaining" >= 0 AND "attempts_remaining" <= 5),
  CONSTRAINT "email_challenges_context_check" CHECK (
    ("purpose" = 'CHECKOUT' AND "checkout_intent_id" IS NOT NULL AND "user_id" IS NULL)
    OR
    ("purpose" = 'PASSWORD_SETUP' AND "checkout_intent_id" IS NULL AND "user_id" IS NOT NULL)
  )
);

CREATE INDEX "email_challenges_checkout_intent_id_purpose_created_at_idx"
  ON "email_challenges"("checkout_intent_id", "purpose", "created_at");
CREATE INDEX "email_challenges_user_id_purpose_created_at_idx"
  ON "email_challenges"("user_id", "purpose", "created_at");
CREATE INDEX "email_challenges_email_purpose_created_at_idx"
  ON "email_challenges"("email", "purpose", "created_at");

ALTER TABLE "email_challenges"
  ADD CONSTRAINT "email_challenges_checkout_intent_id_fkey"
  FOREIGN KEY ("checkout_intent_id") REFERENCES "checkout_intents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_challenges"
  ADD CONSTRAINT "email_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "email_outbox" (
  "id" UUID NOT NULL,
  "event_key" VARCHAR(255) NOT NULL,
  "template" "EmailTemplate" NOT NULL,
  "recipient" VARCHAR(150) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "text_body" TEXT NOT NULL,
  "html_body" TEXT NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lock_token" UUID,
  "locked_at" TIMESTAMPTZ,
  "provider_message_id" VARCHAR(255),
  "last_error" TEXT,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_outbox_attempts_check"
    CHECK ("attempts" >= 0 AND "max_attempts" > 0)
);

CREATE UNIQUE INDEX "email_outbox_event_key_key" ON "email_outbox"("event_key");
CREATE INDEX "email_outbox_status_next_attempt_at_idx"
  ON "email_outbox"("status", "next_attempt_at");
CREATE INDEX "email_outbox_locked_at_idx" ON "email_outbox"("locked_at");

CREATE TABLE "security_throttles" (
  "id" SERIAL NOT NULL,
  "scope" VARCHAR(50) NOT NULL,
  "key_hash" CHAR(64) NOT NULL,
  "window_start" TIMESTAMPTZ NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "blocked_until" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_throttles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "security_throttles_count_check" CHECK ("count" >= 0)
);

CREATE UNIQUE INDEX "security_throttles_scope_key_hash_key"
  ON "security_throttles"("scope", "key_hash");
CREATE INDEX "security_throttles_blocked_until_idx"
  ON "security_throttles"("blocked_until");
