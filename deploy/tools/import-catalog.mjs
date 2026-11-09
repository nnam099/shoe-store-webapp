import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const EXPECTED_SOURCE_DATABASE = 'shoe_store_dev';
const EXPECTED_DESTINATION_DATABASE = 'steplab_docker_verify';
const EXPECTED_COUNTS = Object.freeze({
  brands: 6,
  categories: 6,
  products: 21,
  productCategories: 44,
  colorways: 81,
  variants: 726,
  productImages: 318,
});
const EXPECTED_TOTAL_STOCK = 6347;
const BUSINESS_TABLES = Object.freeze([
  'users', 'admin_accounts', 'orders', 'order_items', 'order_status_histories',
  'reviews', 'external_identities', 'password_reset_tokens', 'checkout_intents',
  'email_challenges', 'email_outbox', 'security_throttles',
]);

function fail(message) { throw new Error(message); }

function parseMode() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');
  if (dryRun === apply) fail('Specify exactly one mode: --dry-run or --apply.');
  return apply ? 'apply' : 'dry-run';
}

function requireConnectionString(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

async function assertDatabase(client, expected, role) {
  const result = await client.query(`
    SELECT current_database() AS database_name,
           current_setting('transaction_read_only') AS transaction_read_only
  `);
  const row = result.rows[0];
  if (row.database_name !== expected) fail(`${role} database identity mismatch.`);
  return row;
}

async function readCatalog(client) {
  const brands = await client.query(`SELECT id, name, slug, logo_url, is_active, created_at, updated_at FROM brands ORDER BY slug`);
  const categories = await client.query(`SELECT id, name, slug, is_active, created_at, updated_at FROM categories ORDER BY slug`);
  const products = await client.query(`SELECT id, brand_id, name, slug, description, is_active, is_featured, created_at, updated_at FROM products ORDER BY slug`);
  const productCategories = await client.query(`SELECT product_id, category_id FROM product_categories ORDER BY product_id, category_id`);
  const colorways = await client.query(`SELECT id, product_id, name, slug, price::text AS price, sale_price::text AS sale_price, color_families, is_default, is_active, created_at, updated_at FROM colorways ORDER BY product_id, slug`);
  const productImages = await client.query(`SELECT id, colorway_id, image_url, display_order, is_thumbnail, created_at FROM product_images ORDER BY colorway_id, display_order`);
  const variants = await client.query(`SELECT id, colorway_id, size, stock, created_at, updated_at FROM variants ORDER BY colorway_id, size`);
  return {
    brands: brands.rows,
    categories: categories.rows,
    products: products.rows,
    productCategories: productCategories.rows,
    colorways: colorways.rows,
    productImages: productImages.rows,
    variants: variants.rows,
  };
}

function countCatalog(catalog) {
  return Object.fromEntries(Object.keys(EXPECTED_COUNTS).map((key) => [key, catalog[key].length]));
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`Duplicate ${label} in source catalog.`);
    seen.add(value);
  }
}

function validateCatalog(catalog, label) {
  const counts = countCatalog(catalog);
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) fail(`${label} ${key} count mismatch: expected ${expected}, received ${counts[key]}.`);
  }
  const brandById = new Map(catalog.brands.map((row) => [row.id, row]));
  const categoryById = new Map(catalog.categories.map((row) => [row.id, row]));
  const productById = new Map(catalog.products.map((row) => [row.id, row]));
  const colorwayById = new Map(catalog.colorways.map((row) => [row.id, row]));
  assertUnique(catalog.brands.map((row) => row.slug), `${label} brand slug`);
  assertUnique(catalog.categories.map((row) => row.slug), `${label} category slug`);
  assertUnique(catalog.products.map((row) => row.slug), `${label} product slug`);
  assertUnique(catalog.colorways.map((row) => `${row.product_id}:${row.slug}`), `${label} colorway key`);
  assertUnique(catalog.productImages.map((row) => `${row.colorway_id}:${row.display_order}`), `${label} product image key`);
  assertUnique(catalog.variants.map((row) => `${row.colorway_id}:${row.size}`), `${label} variant key`);
  for (const row of catalog.products) if (!brandById.has(row.brand_id)) fail(`${label} product has an invalid brand relation.`);
  for (const row of catalog.productCategories) {
    if (!productById.has(row.product_id) || !categoryById.has(row.category_id)) fail(`${label} product-category relation is invalid.`);
  }
  for (const row of catalog.colorways) if (!productById.has(row.product_id)) fail(`${label} colorway relation is invalid.`);
  for (const row of [...catalog.productImages, ...catalog.variants]) {
    if (!colorwayById.has(row.colorway_id)) fail(`${label} colorway child relation is invalid.`);
  }
  for (const product of catalog.products) {
    const defaults = catalog.colorways.filter((row) => row.product_id === product.id && row.is_default).length;
    if (defaults !== 1) fail(`Every ${label} product must have exactly one default colorway.`);
  }
  const totalStock = catalog.variants.reduce((sum, row) => sum + row.stock, 0);
  if (totalStock !== EXPECTED_TOTAL_STOCK) fail(`${label} stock total mismatch: expected ${EXPECTED_TOTAL_STOCK}, received ${totalStock}.`);
  return { counts, totalStock };
}

function iso(value) { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }

function canonicalCatalog(catalog) {
  const brandById = new Map(catalog.brands.map((row) => [row.id, row.slug]));
  const categoryById = new Map(catalog.categories.map((row) => [row.id, row.slug]));
  const productById = new Map(catalog.products.map((row) => [row.id, row.slug]));
  const colorwayById = new Map(catalog.colorways.map((row) => [row.id, `${productById.get(row.product_id)}:${row.slug}`]));
  const sort = (rows) => rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    brands: sort(catalog.brands.map((row) => ({ slug: row.slug, name: row.name, logoUrl: row.logo_url, isActive: row.is_active, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }))),
    categories: sort(catalog.categories.map((row) => ({ slug: row.slug, name: row.name, isActive: row.is_active, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }))),
    products: sort(catalog.products.map((row) => ({ slug: row.slug, brand: brandById.get(row.brand_id), name: row.name, description: row.description, isActive: row.is_active, isFeatured: row.is_featured, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }))),
    productCategories: sort(catalog.productCategories.map((row) => ({ product: productById.get(row.product_id), category: categoryById.get(row.category_id) }))),
    colorways: sort(catalog.colorways.map((row) => ({ product: productById.get(row.product_id), slug: row.slug, name: row.name, price: row.price, salePrice: row.sale_price, colorFamilies: row.color_families, isDefault: row.is_default, isActive: row.is_active, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }))),
    productImages: sort(catalog.productImages.map((row) => ({ colorway: colorwayById.get(row.colorway_id), imageUrl: row.image_url, displayOrder: row.display_order, isThumbnail: row.is_thumbnail, createdAt: iso(row.created_at) }))),
    variants: sort(catalog.variants.map((row) => ({ colorway: colorwayById.get(row.colorway_id), size: row.size, stock: row.stock, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }))),
  };
}

function catalogHash(catalog) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalCatalog(catalog))).digest('hex');
}

async function readBusinessCounts(client) {
  const counts = {};
  for (const table of BUSINESS_TABLES) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  return counts;
}

function assertNoBusinessData(counts) {
  const populated = Object.entries(counts).filter(([, count]) => count !== 0);
  if (populated.length > 0) fail(`Destination contains protected business data in: ${populated.map(([name]) => name).join(', ')}.`);
}

async function upsertCatalog(client, catalog) {
  const brandIds = new Map();
  for (const row of catalog.brands) {
    const result = await client.query(`INSERT INTO brands (name, slug, logo_url, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, logo_url=EXCLUDED.logo_url, is_active=EXCLUDED.is_active, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at RETURNING id`, [row.name,row.slug,row.logo_url,row.is_active,row.created_at,row.updated_at]);
    brandIds.set(row.id, result.rows[0].id);
  }
  const categoryIds = new Map();
  for (const row of catalog.categories) {
    const result = await client.query(`INSERT INTO categories (name, slug, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, is_active=EXCLUDED.is_active, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at RETURNING id`, [row.name,row.slug,row.is_active,row.created_at,row.updated_at]);
    categoryIds.set(row.id, result.rows[0].id);
  }
  const productIds = new Map();
  for (const row of catalog.products) {
    const result = await client.query(`INSERT INTO products (brand_id,name,slug,description,is_active,is_featured,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (slug) DO UPDATE SET brand_id=EXCLUDED.brand_id, name=EXCLUDED.name, description=EXCLUDED.description, is_active=EXCLUDED.is_active, is_featured=EXCLUDED.is_featured, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at RETURNING id`, [brandIds.get(row.brand_id),row.name,row.slug,row.description,row.is_active,row.is_featured,row.created_at,row.updated_at]);
    productIds.set(row.id, result.rows[0].id);
  }
  for (const row of catalog.productCategories) {
    await client.query(`INSERT INTO product_categories (product_id,category_id) VALUES ($1,$2) ON CONFLICT (product_id,category_id) DO NOTHING`, [productIds.get(row.product_id),categoryIds.get(row.category_id)]);
  }
  for (const targetProductId of productIds.values()) await client.query('UPDATE colorways SET is_default=false WHERE product_id=$1', [targetProductId]);
  const colorwayIds = new Map();
  const sortedColorways = [...catalog.colorways].sort((left, right) => Number(left.is_default) - Number(right.is_default));
  for (const row of sortedColorways) {
    const result = await client.query(`INSERT INTO colorways (product_id,name,slug,price,sale_price,color_families,is_default,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (product_id,slug) DO UPDATE SET name=EXCLUDED.name, price=EXCLUDED.price, sale_price=EXCLUDED.sale_price, color_families=EXCLUDED.color_families, is_default=EXCLUDED.is_default, is_active=EXCLUDED.is_active, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at RETURNING id`, [productIds.get(row.product_id),row.name,row.slug,row.price,row.sale_price,row.color_families,row.is_default,row.is_active,row.created_at,row.updated_at]);
    colorwayIds.set(row.id, result.rows[0].id);
  }
  for (const row of catalog.productImages) {
    await client.query(`INSERT INTO product_images (colorway_id,image_url,display_order,is_thumbnail,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (colorway_id,display_order) DO UPDATE SET image_url=EXCLUDED.image_url, is_thumbnail=EXCLUDED.is_thumbnail, created_at=EXCLUDED.created_at`, [colorwayIds.get(row.colorway_id),row.image_url,row.display_order,row.is_thumbnail,row.created_at]);
  }
  for (const row of catalog.variants) {
    await client.query(`INSERT INTO variants (colorway_id,size,stock,created_at,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (colorway_id,size) DO UPDATE SET stock=EXCLUDED.stock, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`, [colorwayIds.get(row.colorway_id),row.size,row.stock,row.created_at,row.updated_at]);
  }
}

async function main() {
  const mode = parseMode();
  const source = new Client({ connectionString: requireConnectionString('SOURCE_DATABASE_URL') });
  const destination = new Client({ connectionString: requireConnectionString('DATABASE_URL') });
  await source.connect();
  await destination.connect();
  let sourceOpen = false;
  let destinationOpen = false;
  try {
    await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    sourceOpen = true;
    const sourceIdentity = await assertDatabase(source, EXPECTED_SOURCE_DATABASE, 'Source');
    if (sourceIdentity.transaction_read_only !== 'on') fail('Source transaction is not read-only.');
    await destination.query(mode === 'apply' ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION READ ONLY');
    destinationOpen = true;
    const destinationIdentity = await assertDatabase(destination, EXPECTED_DESTINATION_DATABASE, 'Destination');
    if (mode === 'apply' && destinationIdentity.transaction_read_only !== 'off') fail('Destination is unexpectedly read-only.');
    const sourceCatalog = await readCatalog(source);
    const summary = validateCatalog(sourceCatalog, 'Source');
    const sourceHash = catalogHash(sourceCatalog);
    assertNoBusinessData(await readBusinessCounts(destination));
    const beforeCatalog = await readCatalog(destination);
    console.log(`MODE=${mode.toUpperCase()}`);
    console.log(`SOURCE_DATABASE=${EXPECTED_SOURCE_DATABASE}`);
    console.log(`DESTINATION_DATABASE=${EXPECTED_DESTINATION_DATABASE}`);
    console.log('SOURCE_TRANSACTION_READ_ONLY=PASS');
    console.log('DESTINATION_BUSINESS_DATA_EMPTY=PASS');
    for (const [key, count] of Object.entries(summary.counts)) console.log(`SOURCE_${key.toUpperCase()}=${count}`);
    console.log(`SOURCE_TOTAL_STOCK=${summary.totalStock}`);
    console.log(`DESTINATION_PRODUCTS_BEFORE=${beforeCatalog.products.length}`);
    if (mode === 'dry-run') {
      await destination.query('ROLLBACK'); destinationOpen = false;
      await source.query('ROLLBACK'); sourceOpen = false;
      console.log('DRY_RUN=PASS');
      return;
    }
    await upsertCatalog(destination, sourceCatalog);
    const destinationCatalog = await readCatalog(destination);
    const destinationSummary = validateCatalog(destinationCatalog, 'Destination');
    if (catalogHash(destinationCatalog) !== sourceHash) fail('Destination catalog does not match source after import.');
    await destination.query('COMMIT'); destinationOpen = false;
    await source.query('ROLLBACK'); sourceOpen = false;
    console.log('DESTINATION_CATALOG_HASH_MATCH=PASS');
    console.log(`DESTINATION_TOTAL_STOCK=${destinationSummary.totalStock}`);
    console.log('IMPORT=PASS');
  } catch (error) {
    if (destinationOpen) await destination.query('ROLLBACK').catch(() => {});
    if (sourceOpen) await source.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await Promise.allSettled([source.end(), destination.end()]);
  }
}

main().catch((error) => {
  console.error(`CATALOG_IMPORT_FAILED=${error.message}`);
  process.exitCode = 1;
});
