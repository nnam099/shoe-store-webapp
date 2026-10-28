import 'dotenv/config';

let testUrl = process.env.DATABASE_URL_TEST?.trim();
if (!testUrl) {
  const developmentValue = process.env.DATABASE_URL?.trim();
  if (!developmentValue) throw new Error('DATABASE_URL_TEST is required for database tests.');
  const developmentUrl = new URL(developmentValue);
  const developmentName = decodeURIComponent(developmentUrl.pathname.replace(/^\//, ''));
  if (developmentName !== 'shoe_store_dev') {
    throw new Error('A missing DATABASE_URL_TEST may only derive the fixed shoe_store_test target from shoe_store_dev.');
  }
  developmentUrl.pathname = '/shoe_store_test';
  testUrl = developmentUrl.toString();
  process.env.DATABASE_URL_TEST = testUrl;
}

let testDatabase;
let developmentDatabase;
try {
  const parsedTest = new URL(testUrl);
  testDatabase = decodeURIComponent(parsedTest.pathname.replace(/^\//, ''));
  if (process.env.DATABASE_URL) {
    developmentDatabase = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.replace(/^\//, ''));
  }
} catch {
  throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL.');
}

if (!testDatabase || !/test/i.test(testDatabase) || testDatabase === 'shoe_store_dev') {
  throw new Error('DATABASE_URL_TEST must target an isolated database whose name contains "test".');
}
if (developmentDatabase && testDatabase === developmentDatabase) {
  throw new Error('DATABASE_URL_TEST must not target the configured development database.');
}

process.env.DATABASE_URL = testUrl;

// Integration tests must never inherit real delivery credentials or security
// secrets from server/.env. Missing SMTP configuration exercises the expected
// safe delivery-failure path without making any external connection.
for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM_ADDRESS']) {
  delete process.env[key];
}
process.env.OTP_HMAC_SECRET = 'test-only-otp-hmac-secret-at-least-32-characters';
process.env.SECURITY_HASH_SECRET = 'test-only-security-hash-secret-at-least-32-characters';
process.env.APP_BASE_URL = 'http://localhost:5173';
