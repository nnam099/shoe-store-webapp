import { pool } from "./pool.js";

const PAGE_SIZE = 12;

const sortClauses = {
  newest: "p.created_at DESC, p.id DESC",
  price_asc: "COALESCE(p.sale_price, p.price) ASC, p.id ASC",
  price_desc: "COALESCE(p.sale_price, p.price) DESC, p.id DESC",
  name_asc: "lower(p.name) ASC, p.id ASC",
};

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function createListFilter(query) {
  const conditions = ["p.deleted_at IS NULL"];
  const parameters = [];
  const addParameter = (value) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };

  if (query.q) {
    const parameter = addParameter(`%${escapeLike(query.q)}%`);
    conditions.push(`p.search_name ILIKE ${parameter} ESCAPE '\\'`);
  }
  if (query.brandIds.length > 0) {
    conditions.push(`p.brand_id = ANY(${addParameter(query.brandIds)}::bigint[])`);
  }
  if (query.categoryIds.length > 0) {
    conditions.push(`p.category_id = ANY(${addParameter(query.categoryIds)}::bigint[])`);
  }
  if (query.minPrice !== undefined) {
    conditions.push(`COALESCE(p.sale_price, p.price) >= ${addParameter(query.minPrice)}`);
  }
  if (query.maxPrice !== undefined) {
    conditions.push(`COALESCE(p.sale_price, p.price) <= ${addParameter(query.maxPrice)}`);
  }
  if (query.sizeIds.length > 0 || query.colorIds.length > 0) {
    const variantConditions = [
      "filtered_variant.product_id = p.id",
      "filtered_variant.deleted_at IS NULL",
      "filtered_variant.stock_quantity > 0",
    ];
    if (query.sizeIds.length > 0) {
      variantConditions.push(`filtered_variant.size_id = ANY(${addParameter(query.sizeIds)}::bigint[])`);
    }
    if (query.colorIds.length > 0) {
      variantConditions.push(`filtered_variant.color_id = ANY(${addParameter(query.colorIds)}::bigint[])`);
    }
    conditions.push(`EXISTS (
      SELECT 1
      FROM product_variants filtered_variant
      WHERE ${variantConditions.join(" AND ")}
    )`);
  }

  return { filter: conditions.join(" AND "), parameters };
}

export function createProductRepository(databasePool = pool) {
  return {
    async list(query) {
      const { filter, parameters } = createListFilter(query);
      const limitParameter = `$${parameters.length + 1}`;
      const offsetParameter = `$${parameters.length + 2}`;
      const listParameters = [...parameters, PAGE_SIZE, (query.page - 1) * PAGE_SIZE];
      const [itemsResult, countResult] = await Promise.all([
        databasePool.query(
          `SELECT p.id::text, p.name, p.slug, p.category_id::text, categories.name AS category_name,
                  p.brand_id::text, brands.name AS brand_name, p.price, p.sale_price,
                  p.badge_label, p.created_at, p.updated_at, main_image.image_path,
                  EXISTS (
                    SELECT 1
                    FROM product_variants stock_variant
                    WHERE stock_variant.product_id = p.id
                      AND stock_variant.deleted_at IS NULL
                      AND stock_variant.stock_quantity > 0
                  ) AS in_stock
           FROM products p
           JOIN categories ON categories.id = p.category_id
           JOIN brands ON brands.id = p.brand_id
           LEFT JOIN LATERAL (
             SELECT image_path
             FROM product_images
             WHERE product_id = p.id
             ORDER BY position, id
             LIMIT 1
           ) main_image ON true
           WHERE ${filter}
           ORDER BY ${sortClauses[query.sort]}
           LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
          listParameters,
        ),
        databasePool.query(`SELECT count(*)::integer AS total FROM products p WHERE ${filter}`, parameters),
      ]);

      return { rows: itemsResult.rows, total: countResult.rows[0].total, pageSize: PAGE_SIZE };
    },

    async getOptions() {
      const [brands, categories, sizes, colors] = await Promise.all([
        databasePool.query(
          `SELECT DISTINCT brands.id::text, brands.name
           FROM brands
           JOIN products ON products.brand_id = brands.id AND products.deleted_at IS NULL
           ORDER BY 2, 1`,
        ),
        databasePool.query(
          `SELECT DISTINCT categories.id::text, categories.name
           FROM categories
           JOIN products ON products.category_id = categories.id AND products.deleted_at IS NULL
           ORDER BY 2, 1`,
        ),
        databasePool.query(
          `SELECT DISTINCT sizes.id::text, sizes.value AS name
           FROM sizes
           JOIN product_variants ON product_variants.size_id = sizes.id
             AND product_variants.deleted_at IS NULL AND product_variants.stock_quantity > 0
           JOIN products ON products.id = product_variants.product_id AND products.deleted_at IS NULL
           ORDER BY 2, 1`,
        ),
        databasePool.query(
          `SELECT DISTINCT colors.id::text, colors.name, colors.hex_code
           FROM colors
           JOIN product_variants ON product_variants.color_id = colors.id
             AND product_variants.deleted_at IS NULL AND product_variants.stock_quantity > 0
           JOIN products ON products.id = product_variants.product_id AND products.deleted_at IS NULL
           ORDER BY 2, 1`,
        ),
      ]);

      return {
        brands: brands.rows,
        categories: categories.rows,
        sizes: sizes.rows,
        colors: colors.rows,
      };
    },

    async findActiveBySlug(slug) {
      const result = await databasePool.query(
        `SELECT p.id::text, p.name, p.slug, p.description, p.material,
                p.category_id::text, categories.name AS category_name,
                p.brand_id::text, brands.name AS brand_name,
                p.price, p.sale_price, p.badge_label, p.created_at, p.updated_at
         FROM products p
         JOIN categories ON categories.id = p.category_id
         JOIN brands ON brands.id = p.brand_id
         WHERE p.slug = $1 AND p.deleted_at IS NULL`,
        [slug],
      );
      return result.rows[0] ?? null;
    },

    async findImages(productId) {
      const result = await databasePool.query(
        `SELECT id::text, image_path, position
         FROM product_images
         WHERE product_id = $1
         ORDER BY position, id`,
        [productId],
      );
      return result.rows;
    },

    async findActiveVariants(productId) {
      const result = await databasePool.query(
        `SELECT product_variants.id::text, product_variants.size_id::text,
                product_variants.color_id::text, product_variants.stock_quantity,
                sizes.value AS size_value, colors.name AS color_name, colors.hex_code
         FROM product_variants
         JOIN sizes ON sizes.id = product_variants.size_id
         JOIN colors ON colors.id = product_variants.color_id
         WHERE product_variants.product_id = $1
           AND product_variants.deleted_at IS NULL
         ORDER BY sizes.value, colors.name, product_variants.id`,
        [productId],
      );
      return result.rows;
    },
  };
}
