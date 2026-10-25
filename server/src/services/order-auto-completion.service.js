import prisma from '../config/db.js';
import {
  ORDER_AUTO_COMPLETE_AFTER_MS,
  ORDER_AUTO_COMPLETE_INTERVAL_MS,
} from '../config/businessTime.js';
import { completeDeliveredOrder } from './order.service.js';

export async function runAutoCompletionSweep({ now = new Date(), batchSize = 100 } = {}) {
  const cutoff = new Date(now.getTime() - ORDER_AUTO_COMPLETE_AFTER_MS);
  const candidates = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { not: null, lte: cutoff },
    },
    orderBy: [{ deliveredAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
    take: batchSize,
  });

  let completed = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    try {
      await completeDeliveredOrder(candidate.id);
      completed += 1;
    } catch (error) {
      if (error?.code === 'ORDER_NOT_CONFIRMABLE') {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { cutoff, candidates: candidates.length, completed, skipped };
}

export function startOrderAutoCompletionWorker({
  intervalMs = ORDER_AUTO_COMPLETE_INTERVAL_MS,
  onError = (error) => console.error('Order auto-completion sweep failed:', error),
} = {}) {
  let running = false;

  const run = async () => {
    if (running) return null;
    running = true;
    try {
      return await runAutoCompletionSweep();
    } catch (error) {
      onError(error);
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
    },
  };
}
