import { getEmailWorkerConfig } from '../config/email.js';
import { closeEmailTransport } from './email-transport.service.js';
import { runEmailOutboxSweep } from './email-outbox.service.js';

const ERROR_LOG_COOLDOWN_MS = 5 * 60_000;

function errorSignature(error) {
  const databaseCode = error?.meta?.driverAdapterError?.cause?.originalCode;
  return `${error?.code || 'UNKNOWN'}:${databaseCode || ''}:${error?.message || ''}`;
}

export function startEmailOutboxWorker({ onError = (error) => console.error('Email outbox sweep failed:', error) } = {}) {
  const { intervalMs, batchSize } = getEmailWorkerConfig();
  let running = false;
  let lastErrorSignature = null;
  let lastErrorLoggedAt = 0;
  const run = async () => {
    if (running) return null;
    running = true;
    try {
      const result = await runEmailOutboxSweep({ batchSize });
      lastErrorSignature = null;
      lastErrorLoggedAt = 0;
      return result;
    } catch (error) {
      const signature = errorSignature(error);
      const now = Date.now();
      if (signature !== lastErrorSignature || now - lastErrorLoggedAt >= ERROR_LOG_COOLDOWN_MS) {
        onError(error);
        lastErrorSignature = signature;
        lastErrorLoggedAt = now;
      }
      return null;
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref?.();
  return {
    runNow: run,
    stop() {
      clearInterval(timer);
      closeEmailTransport();
    },
  };
}
