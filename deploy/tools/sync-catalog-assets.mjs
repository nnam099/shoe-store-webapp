import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const EXPECTED_SOURCE_DATABASE = 'shoe_store_dev';
const EXPECTED_STATIC_PRODUCT_IMAGES = 314;
const EXPECTED_STATIC_BRAND_LOGOS = 5;
const EXPECTED_MANAGED_ASSETS = 5;

function fail(message) { throw new Error(message); }
function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}
function safePath(root, relative) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative.replace(/^[/\\]+/, ''));
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) fail('Unsafe catalog asset path.');
  return resolved;
}
async function sha256File(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}
async function sha256Response(url) {
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) fail(`Asset HTTP verification failed with status ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  const verifyOnly = process.argv.includes('--verify-only');
  const sync = process.argv.includes('--sync');
  if (verifyOnly === sync) fail('Specify exactly one mode: --verify-only or --sync.');
  const sourceRoot = requireEnv('SOURCE_UPLOAD_ROOT');
  const targetRoot = requireEnv('TARGET_UPLOAD_ROOT');
  const staticRoot = requireEnv('STATIC_ASSET_ROOT');
  const managedBaseUrl = requireEnv('MANAGED_BASE_URL').replace(/\/$/, '');
  const client = new Client({ connectionString: requireEnv('SOURCE_DATABASE_URL') });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN TRANSACTION READ ONLY'); transactionOpen = true;
    const identity = await client.query(`SELECT current_database() AS database_name, current_setting('transaction_read_only') AS transaction_read_only`);
    if (identity.rows[0].database_name !== EXPECTED_SOURCE_DATABASE) fail('Source database identity mismatch.');
    if (identity.rows[0].transaction_read_only !== 'on') fail('Source transaction is not read-only.');
    const rows = (await client.query(`SELECT image_url AS url FROM product_images UNION ALL SELECT logo_url AS url FROM brands WHERE logo_url IS NOT NULL ORDER BY url`)).rows;
    const managed = rows.filter(({ url }) => url.startsWith('/api/uploads/'));
    const staticAssets = rows.filter(({ url }) => !url.startsWith('/api/uploads/') && !/^https?:\/\//i.test(url));
    const staticProductImages = (await client.query(`SELECT COUNT(*)::int AS count FROM product_images WHERE image_url NOT LIKE '/api/uploads/%' AND image_url !~* '^https?://'`)).rows[0].count;
    const staticBrandLogos = (await client.query(`SELECT COUNT(*)::int AS count FROM brands WHERE logo_url IS NOT NULL AND logo_url NOT LIKE '/api/uploads/%' AND logo_url !~* '^https?://'`)).rows[0].count;
    if (staticProductImages !== EXPECTED_STATIC_PRODUCT_IMAGES) fail('Static product image count mismatch.');
    if (staticBrandLogos !== EXPECTED_STATIC_BRAND_LOGOS) fail('Static brand logo count mismatch.');
    if (managed.length !== EXPECTED_MANAGED_ASSETS) fail('Managed catalog asset count mismatch.');
    let staticVerified = 0;
    for (const { url } of staticAssets) {
      await sha256File(safePath(staticRoot, url));
      staticVerified += 1;
    }
    let managedVerified = 0;
    for (const { url } of managed) {
      const relative = url.slice('/api/uploads/'.length);
      const source = safePath(sourceRoot, relative);
      const target = safePath(targetRoot, relative);
      const sourceHash = await sha256File(source);
      if (sync) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        const temporary = `${target}.catalog-import.tmp`;
        await fs.copyFile(source, temporary);
        if (await sha256File(temporary) !== sourceHash) fail('Copied upload checksum mismatch.');
        await fs.rename(temporary, target);
      }
      if (await sha256File(target) !== sourceHash) fail('Target upload checksum mismatch.');
      if (await sha256Response(`${managedBaseUrl}${url}`) !== sourceHash) fail('Public upload checksum mismatch.');
      managedVerified += 1;
    }
    await client.query('ROLLBACK'); transactionOpen = false;
    console.log('SOURCE_DATABASE=shoe_store_dev');
    console.log('SOURCE_TRANSACTION_READ_ONLY=PASS');
    console.log(`STATIC_PRODUCT_IMAGES_VERIFIED=${staticProductImages}`);
    console.log(`STATIC_BRAND_LOGOS_VERIFIED=${staticBrandLogos}`);
    console.log(`STATIC_ASSET_FILES_VERIFIED=${staticVerified}`);
    console.log(`MANAGED_ASSETS_CHECKSUM_VERIFIED=${managedVerified}`);
    console.log(`ASSET_MODE=${sync ? 'SYNC' : 'VERIFY_ONLY'}`);
    console.log('ASSET_VERIFICATION=PASS');
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`CATALOG_ASSET_SYNC_FAILED=${error.message}`);
  process.exitCode = 1;
});
