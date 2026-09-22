export function up(pgm) {
  pgm.sql(`
    CREATE TABLE admin_accounts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      full_name varchar(120) NOT NULL CHECK (btrim(full_name) <> ''),
      email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email) AND btrim(email) <> ''),
      password_hash varchar(255) NOT NULL CHECK (btrim(password_hash) <> ''),
      deleted_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE customers (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      full_name varchar(120) NOT NULL CHECK (btrim(full_name) <> ''),
      email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email) AND btrim(email) <> ''),
      phone varchar(10) NOT NULL UNIQUE CHECK (phone ~ '^0[0-9]{9}$'),
      password_hash varchar(255) NOT NULL CHECK (btrim(password_hash) <> ''),
      default_province varchar(120) NULL,
      default_district varchar(120) NULL,
      default_ward varchar(120) NULL,
      default_address_line varchar(255) NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_customers_complete_default_address CHECK (
        (
          default_province IS NULL
          AND default_district IS NULL
          AND default_ward IS NULL
          AND default_address_line IS NULL
        )
        OR
        (
          default_province IS NOT NULL
          AND btrim(default_province) <> ''
          AND default_district IS NOT NULL
          AND btrim(default_district) <> ''
          AND default_ward IS NOT NULL
          AND btrim(default_ward) <> ''
          AND default_address_line IS NOT NULL
          AND btrim(default_address_line) <> ''
        )
      )
    );

    CREATE TABLE categories (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE brands (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE sizes (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      value varchar(30) NOT NULL CHECK (btrim(value) <> ''),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE colors (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name varchar(60) NOT NULL CHECK (btrim(name) <> ''),
      hex_code varchar(7) NULL CHECK (hex_code IS NULL OR hex_code ~ '^#[0-9A-Fa-f]{6}$'),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE products (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      category_id bigint NOT NULL REFERENCES categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      brand_id bigint NOT NULL REFERENCES brands(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      name varchar(200) NOT NULL CHECK (btrim(name) <> ''),
      search_name varchar(200) NOT NULL CHECK (btrim(search_name) <> ''),
      slug varchar(240) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
      description text NULL,
      material varchar(200) NULL,
      price bigint NOT NULL CHECK (price > 0),
      sale_price bigint NULL CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price < price)),
      badge_label varchar(20) NULL CHECK (badge_label IN ('new', 'bestseller', 'featured')),
      deleted_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE product_images (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id bigint NOT NULL REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      image_path varchar(500) NOT NULL UNIQUE CHECK (btrim(image_path) <> ''),
      position smallint NOT NULL CHECK (position BETWEEN 1 AND 8),
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_product_images_product_position
        UNIQUE (product_id, position) DEFERRABLE INITIALLY DEFERRED
    );

    CREATE TABLE product_variants (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id bigint NOT NULL REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      size_id bigint NOT NULL REFERENCES sizes(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      color_id bigint NOT NULL REFERENCES colors(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      deleted_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (product_id, size_id, color_id)
    );

    CREATE TABLE carts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id bigint NOT NULL UNIQUE REFERENCES customers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE cart_items (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      cart_id bigint NOT NULL REFERENCES carts(id) ON UPDATE RESTRICT ON DELETE CASCADE,
      product_variant_id bigint NOT NULL REFERENCES product_variants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      quantity integer NOT NULL CHECK (quantity > 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (cart_id, product_variant_id)
    );

    CREATE TABLE orders (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_code varchar(15) NOT NULL UNIQUE CHECK (
        order_code ~ '^DH[0-9]{6}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
      ),
      customer_id bigint NULL REFERENCES customers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      recipient_name varchar(120) NOT NULL CHECK (btrim(recipient_name) <> ''),
      recipient_phone varchar(10) NOT NULL CHECK (recipient_phone ~ '^0[0-9]{9}$'),
      recipient_province varchar(120) NOT NULL CHECK (btrim(recipient_province) <> ''),
      recipient_district varchar(120) NOT NULL CHECK (btrim(recipient_district) <> ''),
      recipient_ward varchar(120) NOT NULL CHECK (btrim(recipient_ward) <> ''),
      recipient_address_line varchar(255) NOT NULL CHECK (btrim(recipient_address_line) <> ''),
      note varchar(1000) NULL,
      status varchar(32) NOT NULL DEFAULT 'pending_confirmation' CHECK (
        status IN ('pending_confirmation', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled')
      ),
      subtotal bigint NOT NULL CHECK (subtotal > 0),
      shipping_fee bigint NOT NULL CHECK (shipping_fee >= 0),
      grand_total bigint NOT NULL,
      completed_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_orders_grand_total CHECK (grand_total = subtotal + shipping_fee),
      CONSTRAINT ck_orders_completed_at CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR (status <> 'completed' AND completed_at IS NULL)
      )
    );

    CREATE TABLE order_items (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id bigint NOT NULL REFERENCES orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      product_id bigint NOT NULL REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      product_variant_id bigint NOT NULL REFERENCES product_variants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      product_name varchar(200) NOT NULL CHECK (btrim(product_name) <> ''),
      brand_name varchar(100) NOT NULL CHECK (btrim(brand_name) <> ''),
      size_value varchar(30) NOT NULL CHECK (btrim(size_value) <> ''),
      color_name varchar(60) NOT NULL CHECK (btrim(color_name) <> ''),
      image_path varchar(500) NOT NULL CHECK (btrim(image_path) <> ''),
      unit_price bigint NOT NULL CHECK (unit_price > 0),
      quantity integer NOT NULL CHECK (quantity > 0),
      line_total bigint NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_order_items_order_variant UNIQUE (order_id, product_variant_id),
      CONSTRAINT ck_order_items_line_total CHECK (line_total = unit_price * quantity)
    );

    CREATE TABLE order_status_history (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id bigint NOT NULL REFERENCES orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      from_status varchar(32) NULL CHECK (
        from_status IS NULL
        OR from_status IN ('pending_confirmation', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled')
      ),
      to_status varchar(32) NOT NULL CHECK (
        to_status IN ('pending_confirmation', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled')
      ),
      actor_type varchar(16) NOT NULL CHECK (actor_type IN ('guest', 'customer', 'admin', 'system')),
      actor_customer_id bigint NULL REFERENCES customers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      actor_admin_id bigint NULL REFERENCES admin_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      actor_name varchar(120) NULL,
      note varchar(1000) NULL,
      changed_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_order_status_history_change CHECK (from_status IS NULL OR from_status <> to_status),
      CONSTRAINT ck_order_status_history_actor CHECK (
        (actor_type = 'customer' AND actor_customer_id IS NOT NULL AND actor_admin_id IS NULL)
        OR (actor_type = 'admin' AND actor_admin_id IS NOT NULL AND actor_customer_id IS NULL)
        OR (actor_type IN ('guest', 'system') AND actor_customer_id IS NULL AND actor_admin_id IS NULL)
      )
    );
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS order_status_history;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS carts;
    DROP TABLE IF EXISTS product_variants;
    DROP TABLE IF EXISTS product_images;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS colors;
    DROP TABLE IF EXISTS sizes;
    DROP TABLE IF EXISTS brands;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS admin_accounts;
  `);
}
