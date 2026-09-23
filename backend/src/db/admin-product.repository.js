import { pool } from "./pool.js";
import { withTransaction } from "./transaction.js";

const PAGE_SIZE = 20;
const sortSql = {
  newest: "products.created_at DESC, products.id DESC",
  oldest: "products.created_at ASC, products.id ASC",
  name_asc: "products.search_name ASC, products.id ASC",
  name_desc: "products.search_name DESC, products.id DESC",
  price_asc: "COALESCE(products.sale_price, products.price) ASC, products.id ASC",
  price_desc: "COALESCE(products.sale_price, products.price) DESC, products.id DESC",
};

const productColumns = `products.id::text, products.category_id::text, products.brand_id::text,
  products.name, products.search_name, products.slug, products.description, products.material,
  products.price::text, products.sale_price::text, products.badge_label,
  products.created_at, products.updated_at, categories.name AS category_name,
  brands.name AS brand_name`;

function queries(executor) {
  return {
    async list({ q, categoryId, brandId, sort, page }) {
      const offset = (page - 1) * PAGE_SIZE;
      const parameters = [q, categoryId ?? null, brandId ?? null, PAGE_SIZE, offset];
      const filter = `products.deleted_at IS NULL
        AND ($1 = '' OR products.search_name LIKE '%' || $1 || '%')
        AND ($2::bigint IS NULL OR products.category_id = $2)
        AND ($3::bigint IS NULL OR products.brand_id = $3)`;
      const [items, count] = await Promise.all([
        executor.query(
          `SELECT ${productColumns}, main_image.image_path,
             COALESCE(stock.total_stock, 0)::integer AS total_stock
           FROM products
           JOIN categories ON categories.id = products.category_id
           JOIN brands ON brands.id = products.brand_id
           LEFT JOIN LATERAL (
             SELECT image_path FROM product_images
             WHERE product_id = products.id AND position = 1
           ) main_image ON true
           LEFT JOIN LATERAL (
             SELECT COALESCE(sum(stock_quantity), 0) AS total_stock
             FROM product_variants
             WHERE product_id = products.id AND deleted_at IS NULL
           ) stock ON true
           WHERE ${filter}
           ORDER BY ${sortSql[sort]}
           LIMIT $4 OFFSET $5`,
          parameters,
        ),
        executor.query(`SELECT count(*)::integer AS total FROM products WHERE ${filter}`, parameters.slice(0, 3)),
      ]);
      return { rows: items.rows, total: count.rows[0].total, pageSize: PAGE_SIZE };
    },

    async findActiveById(productId, { lock = false } = {}) {
      const result = await executor.query(
        `SELECT ${productColumns}
         FROM products
         JOIN categories ON categories.id = products.category_id
         JOIN brands ON brands.id = products.brand_id
         WHERE products.id = $1 AND products.deleted_at IS NULL
         ${lock ? "FOR UPDATE OF products" : ""}`,
        [productId],
      );
      return result.rows[0] ?? null;
    },

    async findImages(productId) {
      const result = await executor.query(
        `SELECT id::text, image_path, position
         FROM product_images WHERE product_id = $1 ORDER BY position`,
        [productId],
      );
      return result.rows;
    },

    async lockImages(productId) {
      const result = await executor.query(
        `SELECT id::text, image_path, position
         FROM product_images WHERE product_id = $1 ORDER BY position FOR UPDATE`,
        [productId],
      );
      return result.rows;
    },

    async findActiveVariants(productId) {
      const result = await executor.query(
        `SELECT variants.id::text, variants.size_id::text, variants.color_id::text,
           variants.stock_quantity, sizes.value AS size_value, colors.name AS color_name,
           colors.hex_code
         FROM product_variants variants
         JOIN sizes ON sizes.id = variants.size_id
         JOIN colors ON colors.id = variants.color_id
         WHERE variants.product_id = $1 AND variants.deleted_at IS NULL
         ORDER BY sizes.value, colors.name, variants.id`,
        [productId],
      );
      return result.rows;
    },

    async lockActiveVariants(productId) {
      const result = await executor.query(
        `SELECT id::text, size_id::text, color_id::text, stock_quantity
         FROM product_variants
         WHERE product_id = $1 AND deleted_at IS NULL
         ORDER BY id FOR UPDATE`,
        [productId],
      );
      return result.rows;
    },

    async findVariantPair(productId, sizeId, colorId) {
      const result = await executor.query(
        `SELECT id::text, deleted_at
         FROM product_variants
         WHERE product_id = $1 AND size_id = $2 AND color_id = $3
         FOR UPDATE`,
        [productId, sizeId, colorId],
      );
      return result.rows[0] ?? null;
    },

    async variantReferencesExist(sizeId, colorId) {
      const result = await executor.query(
        `SELECT
           EXISTS (SELECT 1 FROM sizes WHERE id = $1) AS size_exists,
           EXISTS (SELECT 1 FROM colors WHERE id = $2) AS color_exists`,
        [sizeId, colorId],
      );
      return result.rows[0];
    },

    async insertVariant(productId, input) {
      const result = await executor.query(
        `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
         VALUES ($1, $2, $3, $4) RETURNING id::text`,
        [productId, input.sizeId, input.colorId, input.stockQuantity],
      );
      return result.rows[0].id;
    },

    async restoreVariant(variantId, stockQuantity) {
      await executor.query(
        `UPDATE product_variants
         SET stock_quantity = $2, deleted_at = NULL, updated_at = now()
         WHERE id = $1`,
        [variantId, stockQuantity],
      );
    },

    async updateVariantStock(productId, variantId, stockQuantity) {
      const result = await executor.query(
        `UPDATE product_variants
         SET stock_quantity = $3, updated_at = now()
         WHERE product_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [productId, variantId, stockQuantity],
      );
      return result.rowCount === 1;
    },

    async softDeleteVariant(productId, variantId) {
      const result = await executor.query(
        `UPDATE product_variants
         SET deleted_at = now(), updated_at = now()
         WHERE product_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [productId, variantId],
      );
      return result.rowCount === 1;
    },

    async getOptions() {
      const [categories, brands, sizes, colors] = await Promise.all([
        executor.query("SELECT id::text, name FROM categories ORDER BY name, id"),
        executor.query("SELECT id::text, name FROM brands ORDER BY name, id"),
        executor.query("SELECT id::text, value AS name FROM sizes ORDER BY value, id"),
        executor.query("SELECT id::text, name, hex_code FROM colors ORDER BY name, id"),
      ]);
      return {
        categories: categories.rows,
        brands: brands.rows,
        sizes: sizes.rows,
        colors: colors.rows,
      };
    },

    async referencesExist({ categoryId, brandId, variants }) {
      const sizeIds = [...new Set(variants.map((variant) => variant.sizeId))];
      const colorIds = [...new Set(variants.map((variant) => variant.colorId))];
      const result = await executor.query(
        `SELECT
           EXISTS (SELECT 1 FROM categories WHERE id = $1) AS category_exists,
           EXISTS (SELECT 1 FROM brands WHERE id = $2) AS brand_exists,
           (SELECT count(*)::integer FROM sizes WHERE id = ANY($3::bigint[])) AS size_count,
           (SELECT count(*)::integer FROM colors WHERE id = ANY($4::bigint[])) AS color_count`,
        [categoryId, brandId, sizeIds, colorIds],
      );
      return {
        ...result.rows[0],
        expectedSizeCount: sizeIds.length,
        expectedColorCount: colorIds.length,
      };
    },

    async insertProduct(input, slug, searchName) {
      const result = await executor.query(
        `INSERT INTO products
          (category_id, brand_id, name, search_name, slug, description, material,
           price, sale_price, badge_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id::text`,
        [
          input.categoryId,
          input.brandId,
          input.name,
          searchName,
          slug,
          input.description,
          input.material,
          input.price,
          input.salePrice,
          input.badgeLabel,
        ],
      );
      return result.rows[0]?.id ?? null;
    },

    async insertVariants(productId, variants) {
      for (const variant of variants) {
        await executor.query(
          `INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
           VALUES ($1, $2, $3, $4)`,
          [productId, variant.sizeId, variant.colorId, variant.stockQuantity],
        );
      }
    },

    async insertImages(productId, filenames, startPosition = 1) {
      for (let index = 0; index < filenames.length; index += 1) {
        await executor.query(
          `INSERT INTO product_images (product_id, image_path, position)
           VALUES ($1, $2, $3)`,
          [productId, filenames[index], startPosition + index],
        );
      }
    },

    async updateImagePositions(productId, imageIds) {
      for (let index = 0; index < imageIds.length; index += 1) {
        await executor.query(
          "UPDATE product_images SET position = $3 WHERE product_id = $1 AND id = $2",
          [productId, imageIds[index], index + 1],
        );
      }
    },

    async deleteImage(productId, imageId) {
      const result = await executor.query(
        "DELETE FROM product_images WHERE product_id = $1 AND id = $2 RETURNING position",
        [productId, imageId],
      );
      return result.rows[0]?.position ?? null;
    },

    async compactImagePositions(productId, removedPosition) {
      await executor.query(
        `UPDATE product_images SET position = position - 1
         WHERE product_id = $1 AND position > $2`,
        [productId, removedPosition],
      );
    },

    async updateProduct(productId, input, searchName) {
      const has = (key) => Object.hasOwn(input, key);
      const result = await executor.query(
        `UPDATE products
         SET name = CASE WHEN $2 THEN $3 ELSE name END,
             search_name = CASE WHEN $2 THEN $4 ELSE search_name END,
             description = CASE WHEN $5 THEN $6 ELSE description END,
             material = CASE WHEN $7 THEN $8 ELSE material END,
             category_id = CASE WHEN $9 THEN $10 ELSE category_id END,
             brand_id = CASE WHEN $11 THEN $12 ELSE brand_id END,
             price = CASE WHEN $13 THEN $14 ELSE price END,
             sale_price = CASE WHEN $15 THEN $16 ELSE sale_price END,
             badge_label = CASE WHEN $17 THEN $18 ELSE badge_label END,
             updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id::text`,
        [
          productId,
          has("name"),
          input.name ?? null,
          searchName,
          has("description"),
          input.description ?? null,
          has("material"),
          input.material ?? null,
          has("categoryId"),
          input.categoryId ?? null,
          has("brandId"),
          input.brandId ?? null,
          has("price"),
          input.price ?? null,
          has("salePrice"),
          input.salePrice ?? null,
          has("badgeLabel"),
          input.badgeLabel ?? null,
        ],
      );
      return result.rowCount === 1;
    },

    async softDelete(productId) {
      const result = await executor.query(
        `UPDATE products SET deleted_at = now(), updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
        [productId],
      );
      return result.rowCount === 1;
    },
  };
}

export function createAdminProductRepository(databasePool = pool) {
  return {
    ...queries(databasePool),
    transaction(callback) {
      return withTransaction((client) => callback(queries(client)), databasePool);
    },
  };
}
