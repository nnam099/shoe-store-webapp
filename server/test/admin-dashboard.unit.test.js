import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_TIME_ZONE,
  ORDER_AUTO_COMPLETE_AFTER_MS,
  addCalendarDays,
  businessDateRange,
  formatBusinessDate,
  parseDateOnly,
} from '../src/config/businessTime.js';
import { assertIsolatedTestDatabase } from './testDatabaseGuard.js';

test('Admin reporting uses the locked Ho Chi Minh business timezone', () => {
  assert.equal(BUSINESS_TIME_ZONE, 'Asia/Ho_Chi_Minh');
  assert.equal(formatBusinessDate(new Date('2026-10-21T16:59:59.000Z')), '2026-10-21');
  assert.equal(formatBusinessDate(new Date('2026-10-21T17:00:00.000Z')), '2026-10-22');
});

test('Business-day UTC range exactly represents a local calendar day', () => {
  const range = businessDateRange('2026-10-22');
  assert.equal(range.start.toISOString(), '2026-10-21T17:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-10-22T17:00:00.000Z');
});

test('Calendar helpers validate dates and preserve calendar arithmetic', () => {
  assert.deepEqual(addCalendarDays(parseDateOnly('2026-02-28', 'date'), 1), {
    year: 2026,
    month: 3,
    day: 1,
    text: '2026-03-01',
  });
  assert.throws(() => parseDateOnly('2026-02-30', 'date'), /valid calendar date/);
});

test('Automatic completion threshold is exactly 48 hours', () => {
  assert.equal(ORDER_AUTO_COMPLETE_AFTER_MS, 48 * 60 * 60 * 1000);
});

test('Integration guard rejects development and accepts an isolated test database', async () => {
  await assert.rejects(
    assertIsolatedTestDatabase({ $queryRaw: async () => [{ database: 'shoe_store_dev' }] }),
    /refuse the development database/
  );
  assert.equal(
    await assertIsolatedTestDatabase({ $queryRaw: async () => [{ database: 'shoe_store_test' }] }),
    'shoe_store_test'
  );
});
