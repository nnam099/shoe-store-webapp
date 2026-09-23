import { pool } from "./pool.js";
import { withTransaction } from "./transaction.js";

const PAGE_SIZE = 20;

const resources = {
  categories: { table: "categories", valueColumn: "name", usageColumn: "category_id" },
  brands: { table: "brands", valueColumn: "name", usageColumn: "brand_id" },
  sizes: { table: "sizes", valueColumn: "value", variantColumn: "size_id" },
  colors: { table: "colors", valueColumn: "name", variantColumn: "color_id", hasHex: true },
};

const sortSql = {
  name_asc: "display_name ASC, id ASC",
  name_desc: "display_name DESC, id DESC",
  newest: "created_at DESC, id DESC",
  oldest: "created_at ASC, id ASC",
};

function queries(executor) {
  return {
    async list(resource, { q, sort, page }) {
      const config = resources[resource];
      const offset = (page - 1) * PAGE_SIZE;
      const selectHex = config.hasHex ? ", hex_code" : ", NULL::varchar AS hex_code";
      const [itemsResult, countResult] = await Promise.all([
        executor.query(
          `SELECT id::text, ${config.valueColumn} AS display_name${selectHex}, created_at, updated_at
           FROM ${config.table}
           WHERE ($1 = '' OR ${config.valueColumn} ILIKE '%' || $1 || '%')
           ORDER BY ${sortSql[sort]}
           LIMIT $2 OFFSET $3`,
          [q, PAGE_SIZE, offset],
        ),
        executor.query(
          `SELECT count(*)::integer AS total
           FROM ${config.table}
           WHERE ($1 = '' OR ${config.valueColumn} ILIKE '%' || $1 || '%')`,
          [q],
        ),
      ]);

      return { rows: itemsResult.rows, total: countResult.rows[0].total, pageSize: PAGE_SIZE };
    },

    async findById(resource, id) {
      const config = resources[resource];
      const selectHex = config.hasHex ? ", hex_code" : ", NULL::varchar AS hex_code";
      const result = await executor.query(
        `SELECT id::text, ${config.valueColumn} AS display_name${selectHex}, created_at, updated_at
         FROM ${config.table}
         WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async create(resource, { name, hexCode }) {
      const config = resources[resource];
      const columns = config.hasHex ? `${config.valueColumn}, hex_code` : config.valueColumn;
      const values = config.hasHex ? "$1, $2" : "$1";
      const parameters = config.hasHex ? [name, hexCode] : [name];
      const result = await executor.query(
        `INSERT INTO ${config.table} (${columns})
         VALUES (${values})
         RETURNING id::text`,
        parameters,
      );
      return result.rows[0].id;
    },

    async update(resource, id, { name, hexCode }) {
      const config = resources[resource];
      const setSql = config.hasHex
        ? `${config.valueColumn} = $2, hex_code = $3, updated_at = now()`
        : `${config.valueColumn} = $2, updated_at = now()`;
      const parameters = config.hasHex ? [id, name, hexCode] : [id, name];
      const result = await executor.query(
        `UPDATE ${config.table}
         SET ${setSql}
         WHERE id = $1
         RETURNING id::text`,
        parameters,
      );
      return result.rows[0]?.id ?? null;
    },

    async getUsage(resource, id) {
      const config = resources[resource];
      const joinSql = config.variantColumn
        ? `JOIN product_variants variants ON variants.product_id = products.id
           WHERE variants.${config.variantColumn} = $1`
        : `WHERE products.${config.usageColumn} = $1`;
      const distinct = config.variantColumn ? "DISTINCT " : "";
      const result = await executor.query(
        `SELECT
           count(${distinct}products.id) FILTER (WHERE products.deleted_at IS NULL)::integer AS active_products,
           count(${distinct}products.id) FILTER (WHERE products.deleted_at IS NOT NULL)::integer AS deleted_products
         FROM products
         ${joinSql}`,
        [id],
      );
      return result.rows[0];
    },

    async delete(resource, id) {
      const config = resources[resource];
      const result = await executor.query(`DELETE FROM ${config.table} WHERE id = $1`, [id]);
      return result.rowCount === 1;
    },

    async lock(resource, id) {
      const config = resources[resource];
      const result = await executor.query(`SELECT id FROM ${config.table} WHERE id = $1 FOR UPDATE`, [id]);
      return result.rowCount === 1;
    },
  };
}

export function createAdminCatalogRepository(databasePool = pool) {
  return {
    ...queries(databasePool),
    transaction(callback) {
      return withTransaction((client) => callback(queries(client)), databasePool);
    },
  };
}
