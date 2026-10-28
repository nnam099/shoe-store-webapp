import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { sendEmail } from './email-transport.service.js';

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export function enqueueEmail(db, { eventKey, recipient, template, subject, text, html }) {
  return db.emailOutbox.upsert({
    where: { eventKey },
    update: {},
    create: {
      eventKey,
      recipient,
      template,
      subject,
      textBody: text,
      htmlBody: html,
    },
  });
}

async function claimBatch(batchSize, now) {
  const lockToken = randomUUID();
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  const rows = await prisma.$queryRaw`
    WITH candidates AS (
      SELECT "id"
      FROM "email_outbox"
      WHERE
        "status" IN ('QUEUED', 'RETRY', 'PROCESSING')
        AND "next_attempt_at" <= ${now}
        AND ("locked_at" IS NULL OR "locked_at" <= ${staleBefore})
      ORDER BY "next_attempt_at" ASC, "created_at" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    UPDATE "email_outbox" AS outbox
    SET "status" = 'PROCESSING', "lock_token" = ${lockToken}::uuid,
        "locked_at" = ${now}, "updated_at" = ${now}
    FROM candidates
    WHERE outbox."id" = candidates."id"
    RETURNING outbox.*
  `;
  return { lockToken, rows };
}

function safeErrorMessage(error) {
  const value = typeof error?.message === 'string' ? error.message : 'Email delivery failed';
  return value.replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

export async function runEmailOutboxSweep({ now = new Date(), batchSize = 20 } = {}) {
  const { lockToken, rows } = await claimBatch(batchSize, now);
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const attempts = Number(row.attempts) + 1;
    try {
      const result = await sendEmail({
        to: row.recipient,
        subject: row.subject,
        text: row.text_body,
        html: row.html_body,
        messageId: `<${row.event_key.replace(/[^A-Za-z0-9._-]/g, '.')}@steplab.local>`,
      });
      await prisma.emailOutbox.updateMany({
        where: { id: row.id, lockToken },
        data: {
          status: 'SENT', attempts, sentAt: new Date(),
          providerMessageId: result.messageId, lockToken: null, lockedAt: null,
          lastError: null,
        },
      });
      sent += 1;
    } catch (error) {
      const exhausted = attempts >= Number(row.max_attempts);
      const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
      await prisma.emailOutbox.updateMany({
        where: { id: row.id, lockToken },
        data: {
          status: exhausted ? 'FAILED' : 'RETRY',
          attempts,
          nextAttemptAt: new Date(Date.now() + delay),
          lockToken: null,
          lockedAt: null,
          lastError: safeErrorMessage(error),
        },
      });
      failed += 1;
    }
  }

  return { claimed: rows.length, sent, failed };
}
