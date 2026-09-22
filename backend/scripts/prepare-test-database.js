import pg from "pg";
import { runner } from "node-pg-migrate";
import { URL, fileURLToPath } from "node:url";

const { Client } = pg;

function getTestDatabaseUrl() {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL là bắt buộc để chuẩn bị database test.");
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.slice(1);

  if (!databaseName.endsWith("_test")) {
    throw new Error("Từ chối reset database không có hậu tố _test.");
  }

  return databaseUrl;
}

const databaseUrl = getTestDatabaseUrl();
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE");
  await client.query("CREATE SCHEMA public");
} finally {
  await client.end();
}

await runner({
  databaseUrl,
  dir: fileURLToPath(new URL("../migrations", import.meta.url)),
  direction: "up",
  migrationsTable: "pgmigrations",
  log: () => {},
});
