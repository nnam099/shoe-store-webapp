import { pool } from "./pool.js";
import { withTransaction } from "./transaction.js";

export function createCartRepository(databasePool = pool) {
  return {
    withTransaction(callback) {
      return withTransaction(callback, databasePool);
    },

    async getOrCreateLockedCart(client, customerId) {
      await client.query(
        `INSERT INTO carts (customer_id)
         VALUES ($1)
         ON CONFLICT (customer_id) DO NOTHING`,
        [customerId],
      );
      const result = await client.query(
        `SELECT id::text
         FROM carts
         WHERE customer_id = $1
         FOR UPDATE`,
        [customerId],
      );
      return result.rows[0];
    },

    async findLockedCustomerCart(client, customerId) {
      const result = await client.query(
        `SELECT id::text
         FROM carts
         WHERE customer_id = $1
         FOR UPDATE`,
        [customerId],
      );
      return result.rows[0] ?? null;
    },

    async lockVariants(client, variantIds) {
      const result = await client.query(
        `SELECT pv.id::text,
                pv.stock_quantity,
                (pv.deleted_at IS NULL AND p.deleted_at IS NULL) AS available
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ANY($1::bigint[])
         ORDER BY pv.id
         FOR UPDATE OF pv`,
        [variantIds],
      );
      return result.rows;
    },

    async findCartItemQuantities(client, cartId, variantIds) {
      const result = await client.query(
        `SELECT product_variant_id::text, quantity
         FROM cart_items
         WHERE cart_id = $1 AND product_variant_id = ANY($2::bigint[])`,
        [cartId, variantIds],
      );
      return result.rows;
    },

    async upsertCartItem(client, { cartId, productVariantId, quantity }) {
      await client.query(
        `INSERT INTO cart_items (cart_id, product_variant_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_variant_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()`,
        [cartId, productVariantId, quantity],
      );
    },

    async deleteCartItem(client, { cartId, productVariantId }) {
      const result = await client.query(
        `DELETE FROM cart_items
         WHERE cart_id = $1 AND product_variant_id = $2`,
        [cartId, productVariantId],
      );
      return result.rowCount;
    },

    async findLockedCartItem(client, { cartId, productVariantId }) {
      const result = await client.query(
        `SELECT product_variant_id::text, quantity
         FROM cart_items
         WHERE cart_id = $1 AND product_variant_id = $2
         FOR UPDATE`,
        [cartId, productVariantId],
      );
      return result.rows[0] ?? null;
    },

    async updateCartItemQuantity(client, { cartId, productVariantId, quantity }) {
      await client.query(
        `UPDATE cart_items
         SET quantity = $3, updated_at = now()
         WHERE cart_id = $1 AND product_variant_id = $2`,
        [cartId, productVariantId, quantity],
      );
    },

    async touchCart(client, cartId) {
      await client.query("UPDATE carts SET updated_at = now() WHERE id = $1", [cartId]);
    },

    async listCartItems(client, cartId) {
      const result = await client.query(
        `SELECT product_variant_id::text, quantity
         FROM cart_items
         WHERE cart_id = $1
         ORDER BY product_variant_id`,
        [cartId],
      );
      return result.rows;
    },

    async findCustomerCartItems(customerId) {
      const result = await databasePool.query(
        `SELECT ci.product_variant_id::text, ci.quantity
         FROM carts c
         JOIN cart_items ci ON ci.cart_id = c.id
         WHERE c.customer_id = $1
         ORDER BY ci.created_at, ci.id`,
        [customerId],
      );
      return result.rows;
    },

    async findVariantDetails(variantIds) {
      if (variantIds.length === 0) {
        return [];
      }

      const result = await databasePool.query(
        `SELECT pv.id::text AS product_variant_id,
                pv.stock_quantity,
                pv.deleted_at AS variant_deleted_at,
                p.id::text AS product_id,
                p.name AS product_name,
                p.slug AS product_slug,
                p.price,
                p.sale_price,
                p.deleted_at AS product_deleted_at,
                s.id::text AS size_id,
                s.value AS size_value,
                co.id::text AS color_id,
                co.name AS color_name,
                co.hex_code,
                image.image_path
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         JOIN sizes s ON s.id = pv.size_id
         JOIN colors co ON co.id = pv.color_id
         LEFT JOIN LATERAL (
           SELECT pi.image_path
           FROM product_images pi
           WHERE pi.product_id = p.id
           ORDER BY pi.position, pi.id
           LIMIT 1
         ) image ON true
         WHERE pv.id = ANY($1::bigint[])
         ORDER BY pv.id`,
        [variantIds],
      );
      return result.rows;
    },
  };
}
