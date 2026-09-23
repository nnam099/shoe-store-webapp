import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { products } from "../../seeds/data.js";
import { seedDatabase } from "../../seeds/seed.js";
import { createSlugBase } from "../../src/utils/product-slug.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("development seed", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  let firstCounts;
  let secondCounts;

  async function getCounts() {
    const result = await pool.query(`
      SELECT
        (SELECT count(*)::integer FROM admin_accounts WHERE email = 'seed.admin@example.com') AS admins,
        (SELECT count(*)::integer FROM customers WHERE email IN (
          'minh.anh@example.com', 'hoang.nam@example.com', 'thu.ha@example.com'
        )) AS customers,
        (SELECT count(*)::integer FROM products WHERE slug LIKE 'sai-%') AS products,
        (SELECT count(*)::integer FROM product_images WHERE image_path LIKE 'seed-shoe-%') AS images,
        (SELECT count(*)::integer
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE p.slug LIKE 'sai-%') AS variants,
        (SELECT count(*)::integer FROM orders WHERE order_code LIKE 'DH260921-SEED%') AS orders,
        (SELECT count(*)::integer
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.order_code LIKE 'DH260921-SEED%') AS items,
        (SELECT count(*)::integer
         FROM order_status_history h
         JOIN orders o ON o.id = h.order_id
         WHERE o.order_code LIKE 'DH260921-SEED%') AS histories
    `);
    return result.rows[0];
  }

  beforeAll(async () => {
    const uploadDirectory = await mkdtemp(join(tmpdir(), "shoe-store-seed-"));
    const options = {
      databasePool: pool,
      uploadDirectory,
      adminEmail: "seed.admin@example.com",
      adminPassword: "SeedAdmin123!",
      customerPassword: "SeedCustomer123!",
    };

    await seedDatabase(options);
    firstCounts = await getCounts();
    await seedDatabase(options);
    secondCounts = await getCounts();
  }, 30000);

  afterAll(async () => {
    await pool.end();
  });

  it("is idempotent and creates the approved amount of P1 data", () => {
    expect(firstCounts).toEqual({
      admins: 1,
      customers: 3,
      products: 20,
      images: 20,
      variants: 40,
      orders: 6,
      items: 6,
      histories: 17,
    });
    expect(secondCounts).toEqual(firstCounts);
  });

  it("generates product slugs from names with the shared slug utility", async () => {
    const result = await pool.query(
      `SELECT name, slug
       FROM products
       WHERE name = ANY($1::text[])
       ORDER BY name`,
      [products.map((product) => product.name)],
    );
    const slugsByName = new Map(result.rows.map((product) => [product.name, product.slug]));

    expect(result.rows).toHaveLength(products.length);
    expect(slugsByName.get("Sải Tempo")).toBe("sai-tempo");
    expect(slugsByName.get("Sải City Walk")).toBe("sai-city-walk");
    expect(new Set(result.rows.map((product) => product.slug)).size).toBe(products.length);

    for (const product of products) {
      expect(slugsByName.get(product.name)).toBe(createSlugBase(product.name));
    }
  });

  it("creates Guest and Customer orders in all six statuses", async () => {
    const result = await pool.query(`
      SELECT status,
             count(*)::integer AS total,
             count(*) FILTER (WHERE customer_id IS NULL)::integer AS guest_total,
             count(*) FILTER (WHERE customer_id IS NOT NULL)::integer AS customer_total
      FROM orders
      WHERE order_code LIKE 'DH260921-SEED%'
      GROUP BY status
      ORDER BY status
    `);

    expect(result.rows.map((row) => row.status)).toEqual([
      "cancelled",
      "completed",
      "delivered",
      "pending_confirmation",
      "preparing",
      "shipping",
    ]);
    expect(result.rows.some((row) => row.guest_total > 0)).toBe(true);
    expect(result.rows.some((row) => row.customer_total > 0)).toBe(true);
  });

  it("keeps totals, snapshots, completed timestamps and history consistent", async () => {
    const invalidOrders = await pool.query(`
      SELECT o.id
      FROM orders o
      JOIN LATERAL (
        SELECT sum(oi.line_total) AS item_total,
               bool_and(
                 btrim(oi.product_name) <> ''
                 AND btrim(oi.brand_name) <> ''
                 AND btrim(oi.size_value) <> ''
                 AND btrim(oi.color_name) <> ''
                 AND btrim(oi.image_path) <> ''
               ) AS snapshots_complete
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) item_summary ON true
      WHERE o.order_code LIKE 'DH260921-SEED%'
        AND (o.subtotal <> item_summary.item_total
         OR o.grand_total <> o.subtotal + o.shipping_fee
         OR item_summary.snapshots_complete IS NOT TRUE
         OR (o.status = 'completed') <> (o.completed_at IS NOT NULL))
    `);
    const invalidHistory = await pool.query(`
      SELECT o.id
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT (array_agg(h.to_status ORDER BY h.changed_at, h.id))[1] AS first_status,
               (array_agg(h.to_status ORDER BY h.changed_at DESC, h.id DESC))[1] AS last_status,
               (array_agg(h.from_status ORDER BY h.changed_at, h.id))[1] AS first_from_status
        FROM order_status_history h
        WHERE h.order_id = o.id
      ) history ON true
      WHERE o.order_code LIKE 'DH260921-SEED%'
        AND (history.first_from_status IS NOT NULL
         OR history.first_status <> 'pending_confirmation'
         OR history.last_status <> o.status)
    `);

    expect(invalidOrders.rows).toEqual([]);
    expect(invalidHistory.rows).toEqual([]);
  });

  it("hashes passwords with Argon2id and does not create P2 reviews", async () => {
    const hashes = await pool.query(`
      SELECT password_hash FROM admin_accounts WHERE email = 'seed.admin@example.com'
      UNION ALL
      SELECT password_hash FROM customers WHERE email IN (
        'minh.anh@example.com', 'hoang.nam@example.com', 'thu.ha@example.com'
      )
    `);
    const reviews = await pool.query("SELECT to_regclass('public.reviews') AS table_name");

    expect(hashes.rows).toHaveLength(4);
    expect(hashes.rows.every((row) => row.password_hash.startsWith("$argon2id$"))).toBe(true);
    expect(reviews.rows[0].table_name).toBeNull();
  });
});
