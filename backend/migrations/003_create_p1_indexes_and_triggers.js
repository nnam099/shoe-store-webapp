export function up(pgm) {
  pgm.sql(`
    CREATE UNIQUE INDEX uq_categories_name_ci ON categories (lower(btrim(name)));
    CREATE UNIQUE INDEX uq_brands_name_ci ON brands (lower(btrim(name)));
    CREATE UNIQUE INDEX uq_sizes_value_ci ON sizes (lower(btrim(value)));
    CREATE UNIQUE INDEX uq_colors_name_ci ON colors (lower(btrim(name)));

    CREATE INDEX idx_customers_created_at ON customers (created_at DESC, id DESC);

    CREATE INDEX idx_products_category_active
      ON products (category_id, created_at DESC, id DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX idx_products_brand_active
      ON products (brand_id, created_at DESC, id DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX idx_products_effective_price_active
      ON products ((COALESCE(sale_price, price)), id)
      WHERE deleted_at IS NULL;
    CREATE INDEX idx_products_newest_active
      ON products (created_at DESC, id DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX idx_products_search_name_trgm
      ON products USING GIN (search_name gin_trgm_ops)
      WHERE deleted_at IS NULL;

    CREATE INDEX idx_product_variants_product_active
      ON product_variants (product_id, size_id, color_id)
      WHERE deleted_at IS NULL;
    CREATE INDEX idx_product_variants_size_in_stock
      ON product_variants (size_id, product_id)
      WHERE deleted_at IS NULL AND stock_quantity > 0;
    CREATE INDEX idx_product_variants_color_in_stock
      ON product_variants (color_id, product_id)
      WHERE deleted_at IS NULL AND stock_quantity > 0;
    CREATE INDEX idx_product_variants_size_color_in_stock
      ON product_variants (size_id, color_id, product_id)
      WHERE deleted_at IS NULL AND stock_quantity > 0;

    CREATE INDEX idx_cart_items_variant ON cart_items (product_variant_id);

    CREATE INDEX idx_orders_recipient_phone ON orders (recipient_phone);
    CREATE INDEX idx_orders_customer_created
      ON orders (customer_id, created_at DESC, id DESC)
      WHERE customer_id IS NOT NULL;
    CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC, id DESC);
    CREATE INDEX idx_orders_created ON orders (created_at DESC, id DESC);
    CREATE INDEX idx_orders_completed_at
      ON orders (completed_at, id)
      WHERE status = 'completed';

    CREATE INDEX idx_order_items_order ON order_items (order_id, id);
    CREATE INDEX idx_order_items_product ON order_items (product_id);

    CREATE INDEX idx_order_status_history_order_time
      ON order_status_history (order_id, changed_at, id);
    CREATE INDEX idx_order_status_history_to_time
      ON order_status_history (to_status, changed_at, order_id);

    CREATE FUNCTION prevent_product_slug_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        RAISE EXCEPTION 'product slug is immutable' USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $function$;

    CREATE TRIGGER prevent_product_slug_update
    BEFORE UPDATE OF slug ON products
    FOR EACH ROW
    EXECUTE FUNCTION prevent_product_slug_update();
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TRIGGER IF EXISTS prevent_product_slug_update ON products;
    DROP FUNCTION IF EXISTS prevent_product_slug_update();

    DROP INDEX IF EXISTS idx_order_status_history_to_time;
    DROP INDEX IF EXISTS idx_order_status_history_order_time;
    DROP INDEX IF EXISTS idx_order_items_product;
    DROP INDEX IF EXISTS idx_order_items_order;
    DROP INDEX IF EXISTS idx_orders_completed_at;
    DROP INDEX IF EXISTS idx_orders_created;
    DROP INDEX IF EXISTS idx_orders_status_created;
    DROP INDEX IF EXISTS idx_orders_customer_created;
    DROP INDEX IF EXISTS idx_orders_recipient_phone;
    DROP INDEX IF EXISTS idx_cart_items_variant;
    DROP INDEX IF EXISTS idx_product_variants_size_color_in_stock;
    DROP INDEX IF EXISTS idx_product_variants_color_in_stock;
    DROP INDEX IF EXISTS idx_product_variants_size_in_stock;
    DROP INDEX IF EXISTS idx_product_variants_product_active;
    DROP INDEX IF EXISTS idx_products_search_name_trgm;
    DROP INDEX IF EXISTS idx_products_newest_active;
    DROP INDEX IF EXISTS idx_products_effective_price_active;
    DROP INDEX IF EXISTS idx_products_brand_active;
    DROP INDEX IF EXISTS idx_products_category_active;
    DROP INDEX IF EXISTS idx_customers_created_at;
    DROP INDEX IF EXISTS uq_colors_name_ci;
    DROP INDEX IF EXISTS uq_sizes_value_ci;
    DROP INDEX IF EXISTS uq_brands_name_ci;
    DROP INDEX IF EXISTS uq_categories_name_ci;
  `);
}
