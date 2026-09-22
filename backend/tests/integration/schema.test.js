import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const fixtureSuffix = `${process.pid}-${Date.now()}`;

describeDatabase("P1 database schema", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  let fixture;

  beforeAll(async () => {
    const category = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [`Schema Test Category ${fixtureSuffix}`],
    );
    const brand = await pool.query("INSERT INTO brands (name) VALUES ($1) RETURNING id", [
      `Schema Test Brand ${fixtureSuffix}`,
    ]);
    const size = await pool.query("INSERT INTO sizes (value) VALUES ($1) RETURNING id", [
      `size-${fixtureSuffix}`,
    ]);
    const color = await pool.query(
      "INSERT INTO colors (name, hex_code) VALUES ($1, $2) RETURNING id",
      [`Schema Test Color ${fixtureSuffix}`, "#112233"],
    );
    const product = await pool.query(
      `INSERT INTO products
        (category_id, brand_id, name, search_name, slug, price, badge_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        category.rows[0].id,
        brand.rows[0].id,
        "Schema Test Shoe",
        "schema test shoe",
        `schema-test-shoe-${fixtureSuffix}`,
        1000000,
        "new",
      ],
    );
    const variant = await pool.query(
      `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [product.rows[0].id, size.rows[0].id, color.rows[0].id, 5],
    );

    fixture = {
      categoryId: category.rows[0].id,
      productId: product.rows[0].id,
      variantId: variant.rows[0].id,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates exactly the 14 approved P1 tables and no reviews table", async () => {
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> 'pgmigrations'
      ORDER BY tablename
    `);

    expect(result.rows.map((row) => row.tablename)).toEqual([
      "admin_accounts",
      "brands",
      "cart_items",
      "carts",
      "categories",
      "colors",
      "customers",
      "order_items",
      "order_status_history",
      "orders",
      "product_images",
      "product_variants",
      "products",
      "sizes",
    ]);
  });

  it("enables pg_trgm and creates the approved product badge column", async () => {
    const extension = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = $1) AS available",
      ["pg_trgm"],
    );
    const column = await pool.query(
      `SELECT data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'badge_label'`,
    );

    expect(extension.rows[0].available).toBe(true);
    expect(column.rows[0]).toEqual({
      data_type: "character varying",
      character_maximum_length: 20,
      is_nullable: "YES",
    });
  });

  it("rejects invalid badge, money, stock and order code values", async () => {
    await expect(
      pool.query("UPDATE products SET badge_label = $1 WHERE id = $2", ["automatic", fixture.productId]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query("UPDATE products SET sale_price = price WHERE id = $1", [fixture.productId]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query("UPDATE product_variants SET stock_quantity = -1 WHERE id = $1", [fixture.variantId]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query(
        `INSERT INTO orders
          (order_code, recipient_name, recipient_phone, recipient_province, recipient_district,
           recipient_ward, recipient_address_line, subtotal, shipping_fee, grand_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        ["INVALID", "Người nhận", "0900000000", "Hà Nội", "Ba Đình", "Phúc Xá", "Số 1", 100000, 30000, 130000],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("allows swapping image positions because the unique constraint is deferred", async () => {
    const first = await pool.query(
      "INSERT INTO product_images (product_id, image_path, position) VALUES ($1, $2, 1) RETURNING id",
      [fixture.productId, `schema-test-${fixtureSuffix}-1.webp`],
    );
    const second = await pool.query(
      "INSERT INTO product_images (product_id, image_path, position) VALUES ($1, $2, 2) RETURNING id",
      [fixture.productId, `schema-test-${fixtureSuffix}-2.webp`],
    );
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("UPDATE product_images SET position = 2 WHERE id = $1", [first.rows[0].id]);
      await client.query("UPDATE product_images SET position = 1 WHERE id = $1", [second.rows[0].id]);
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const positions = await pool.query(
      "SELECT id, position FROM product_images WHERE product_id = $1 ORDER BY position",
      [fixture.productId],
    );
    expect(positions.rows).toEqual([
      { id: second.rows[0].id, position: 1 },
      { id: first.rows[0].id, position: 2 },
    ]);
  });

  it("prevents changing a product slug", async () => {
    await expect(
      pool.query("UPDATE products SET slug = $1 WHERE id = $2", ["changed-slug", fixture.productId]),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("keeps referenced products and creates the approved indexes", async () => {
    await expect(pool.query("DELETE FROM categories WHERE id = $1", [fixture.categoryId])).rejects.toMatchObject({
      code: "23001",
    });

    const result = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const indexNames = new Set(result.rows.map((row) => row.indexname));

    for (const indexName of [
      "idx_products_search_name_trgm",
      "idx_products_effective_price_active",
      "idx_product_variants_size_color_in_stock",
      "idx_orders_completed_at",
      "idx_order_status_history_order_time",
    ]) {
      expect(indexNames.has(indexName), `missing index ${indexName}`).toBe(true);
    }
  });
});
