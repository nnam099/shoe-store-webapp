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
      await client.query(
        `DELETE FROM cart_items
         WHERE cart_id = $1 AND product_variant_id = $2`,
        [cartId, productVariantId],
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
  };
}
