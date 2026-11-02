import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { startOrderAutoCompletionWorker } from '../src/services/order-auto-completion.service.js';
import { startEmailOutboxWorker } from '../src/services/email-outbox-worker.service.js';

const port = process.env.PORT || 5000;
let orderWorker;
let emailWorker;
let shuttingDown = false;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  orderWorker = startOrderAutoCompletionWorker();
  emailWorker = startEmailOutboxWorker();
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully.`);

  orderWorker?.stop();
  emailWorker?.stop();

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    server.closeAllConnections?.();
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref?.();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(error ? 1 : 0);
    }
  });
  server.closeIdleConnections?.();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
