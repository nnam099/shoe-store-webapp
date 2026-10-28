import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

function databaseName(url) {
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

const developmentValue = process.env.DATABASE_URL?.trim();
if (!developmentValue) throw new Error('DATABASE_URL is required to locate PostgreSQL.');
const developmentUrl = new URL(developmentValue);
const developmentName = databaseName(developmentUrl);
if (developmentName !== 'shoe_store_dev') {
  throw new Error('Automatic test database preparation only derives from the known shoe_store_dev configuration.');
}

const testUrl = process.env.DATABASE_URL_TEST
  ? new URL(process.env.DATABASE_URL_TEST)
  : new URL(developmentUrl);
if (!process.env.DATABASE_URL_TEST) testUrl.pathname = '/shoe_store_test';
const testName = databaseName(testUrl);
if (!testName || !/test/i.test(testName) || testName === developmentName || !/^[A-Za-z0-9_]+$/.test(testName)) {
  throw new Error('Refusing unsafe test database target.');
}

const maintenanceUrl = new URL(testUrl);
maintenanceUrl.pathname = '/postgres';
const maintenancePool = new pg.Pool({ connectionString: maintenanceUrl.toString(), max: 1 });
try {
  const existing = await maintenancePool.query('SELECT 1 FROM pg_database WHERE datname = $1', [testName]);
  if (existing.rowCount === 0) {
    await maintenancePool.query(`CREATE DATABASE "${testName}"`);
    console.log(`Created isolated test database: ${testName}`);
  } else {
    console.log(`Using existing isolated test database: ${testName}`);
  }
} finally {
  await maintenancePool.end();
}

const currentFile = fileURLToPath(import.meta.url);
const serverRoot = path.resolve(path.dirname(currentFile), '..');
const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: serverRoot,
  env: { ...process.env, DATABASE_URL: testUrl.toString() },
  stdio: 'inherit',
});
if (migration.status !== 0) throw new Error('Test database migration failed.');

const verificationPool = new pg.Pool({ connectionString: testUrl.toString(), max: 1 });
try {
  const database = await verificationPool.query('SELECT current_database() AS name');
  if (database.rows[0]?.name !== testName) throw new Error('Connected test database does not match the verified target.');
  const failed = await verificationPool.query('SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL');
  if (failed.rows[0]?.count !== 0) throw new Error('Test database contains failed or rolled-back migrations.');
  console.log(`Verified migrated test database: ${testName}`);
} finally {
  await verificationPool.end();
}

if (process.argv.includes('--seed')) {
  process.env.DATABASE_URL = testUrl.toString();
  const { seedCatalog } = await import('./seed.js');
  const testPrisma = (await import('../src/config/db.js')).default;
  try {
    await seedCatalog();
    console.log(`Seeded catalog fixtures on isolated test database: ${testName}`);
  } finally {
    await testPrisma.$disconnect();
  }
}
