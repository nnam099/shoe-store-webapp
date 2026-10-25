import assert from 'node:assert/strict';

export async function assertIsolatedTestDatabase(prisma) {
  const rows = await prisma.$queryRaw`SELECT current_database() AS database`;
  const database = rows[0]?.database;

  assert.equal(typeof database, 'string', 'Unable to identify the integration-test database');
  assert.notEqual(database, 'shoe_store_dev', 'Integration tests refuse the development database');
  assert.match(database, /test/i, 'Integration tests require a database whose name contains "test"');

  return database;
}
