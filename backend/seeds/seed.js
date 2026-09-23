import argon2 from "argon2";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "../src/config/env.js";
import { pool } from "../src/db/pool.js";
import { withTransaction } from "../src/db/transaction.js";
import { createSlugBase } from "../src/utils/product-slug.js";
import {
  brands,
  categories,
  colors,
  customers,
  products,
  seedOrders,
  sizes,
  statusPaths,
} from "./data.js";

const seedDirectory = dirname(fileURLToPath(import.meta.url));
const sampleImagePath = join(seedDirectory, "assets", "sample-shoe.webp");

async function upsertNamedLookup(client, tableName, columnName, value) {
  const allowedLookups = new Set([
    "categories:name",
    "brands:name",
    "sizes:value",
  ]);
  const lookupKey = `${tableName}:${columnName}`;

  if (!allowedLookups.has(lookupKey)) {
    throw new Error("Seed lookup không hợp lệ.");
  }

  const existing = await client.query(
    `SELECT id FROM ${tableName} WHERE lower(btrim(${columnName})) = lower(btrim($1))`,
    [value],
  );

  if (existing.rowCount > 0) {
    await client.query(`UPDATE ${tableName} SET ${columnName} = $1, updated_at = now() WHERE id = $2`, [
      value,
      existing.rows[0].id,
    ]);
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO ${tableName} (${columnName}) VALUES ($1) RETURNING id`,
    [value],
  );
  return inserted.rows[0].id;
}

async function upsertColor(client, color) {
  const existing = await client.query(
    "SELECT id FROM colors WHERE lower(btrim(name)) = lower(btrim($1))",
    [color.name],
  );

  if (existing.rowCount > 0) {
    await client.query("UPDATE colors SET name = $1, hex_code = $2, updated_at = now() WHERE id = $3", [
      color.name,
      color.hexCode,
      existing.rows[0].id,
    ]);
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    "INSERT INTO colors (name, hex_code) VALUES ($1, $2) RETURNING id",
    [color.name, color.hexCode],
  );
  return inserted.rows[0].id;
}

async function upsertAdmin(client, passwordHash, adminEmail, adminName) {
  const result = await client.query(
    `INSERT INTO admin_accounts (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           deleted_at = NULL,
           updated_at = now()
     RETURNING id`,
    [adminName, adminEmail.toLowerCase(), passwordHash],
  );
  return result.rows[0].id;
}

async function upsertCustomers(client, passwordHash) {
  const ids = [];

  for (const customer of customers) {
    const result = await client.query(
      `INSERT INTO customers
        (full_name, email, phone, password_hash, default_province, default_district,
         default_ward, default_address_line)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             password_hash = EXCLUDED.password_hash,
             default_province = EXCLUDED.default_province,
             default_district = EXCLUDED.default_district,
             default_ward = EXCLUDED.default_ward,
             default_address_line = EXCLUDED.default_address_line,
             updated_at = now()
       RETURNING id`,
      [
        customer.fullName,
        customer.email,
        customer.phone,
        passwordHash,
        customer.province,
        customer.district,
        customer.ward,
        customer.addressLine,
      ],
    );
    ids.push(result.rows[0].id);
  }

  return ids;
}

async function upsertProducts(client, lookupIds) {
  const seededProducts = [];

  for (const product of products) {
    const slug = createSlugBase(product.name);
    const productResult = await client.query(
      `INSERT INTO products
        (category_id, brand_id, name, search_name, slug, description, material,
         price, sale_price, badge_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (slug) DO UPDATE
         SET category_id = EXCLUDED.category_id,
             brand_id = EXCLUDED.brand_id,
             name = EXCLUDED.name,
             search_name = EXCLUDED.search_name,
             description = EXCLUDED.description,
             material = EXCLUDED.material,
             price = EXCLUDED.price,
             sale_price = EXCLUDED.sale_price,
             badge_label = EXCLUDED.badge_label,
             deleted_at = NULL,
             updated_at = now()
       RETURNING id`,
      [
        lookupIds.categories.get(product.categoryName),
        lookupIds.brands.get(product.brandName),
        product.name,
        product.searchName,
        slug,
        product.description,
        product.material,
        product.price,
        product.salePrice,
        product.badgeLabel,
      ],
    );
    const productId = productResult.rows[0].id;

    await client.query(
      `INSERT INTO product_images (product_id, image_path, position)
       VALUES ($1, $2, 1)
       ON CONFLICT (image_path) DO UPDATE
         SET product_id = EXCLUDED.product_id,
             position = EXCLUDED.position`,
      [productId, product.imagePath],
    );

    const variants = [];
    for (const variant of product.variants) {
      const variantResult = await client.query(
        `INSERT INTO product_variants
          (product_id, size_id, color_id, stock_quantity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, size_id, color_id) DO UPDATE
           SET stock_quantity = EXCLUDED.stock_quantity,
               deleted_at = NULL,
               updated_at = now()
         RETURNING id`,
        [
          productId,
          lookupIds.sizes.get(variant.sizeValue),
          lookupIds.colors.get(variant.colorName),
          variant.stockQuantity,
        ],
      );
      variants.push({
        id: variantResult.rows[0].id,
        sizeValue: variant.sizeValue,
        colorName: variant.colorName,
      });
    }

    seededProducts.push({
      ...product,
      slug,
      id: productId,
      variants,
    });
  }

  return seededProducts;
}

async function createSeedOrder(client, orderDefinition, index, context) {
  const existing = await client.query("SELECT id FROM orders WHERE order_code = $1", [orderDefinition.code]);
  if (existing.rowCount > 0) {
    return;
  }

  const product = context.seededProducts[index];
  const variant = product.variants[0];
  const customer =
    orderDefinition.customerIndex === null ? null : customers[orderDefinition.customerIndex];
  const customerId =
    orderDefinition.customerIndex === null ? null : context.customerIds[orderDefinition.customerIndex];
  const quantity = index % 2 === 0 ? 1 : 2;
  const unitPrice = product.salePrice ?? product.price;
  const subtotal = unitPrice * quantity;
  const grandTotal = subtotal + context.shippingFee;
  const recipient = customer ?? {
    fullName: `Khách vãng lai ${index + 1}`,
    phone: `091000000${index}`,
    province: "Hà Nội",
    district: "Hoàn Kiếm",
    ward: "Hàng Bạc",
    addressLine: `Số ${index + 10} phố Mẫu`,
  };
  const baseChangedAt = new Date(Date.UTC(2026, 8, 15 + index, 2, 0, 0));
  const completedAt =
    orderDefinition.status === "completed"
      ? new Date(baseChangedAt.getTime() + (statusPaths.completed.length - 1) * 60000)
      : null;

  const orderResult = await client.query(
    `INSERT INTO orders
      (order_code, customer_id, recipient_name, recipient_phone, recipient_province,
       recipient_district, recipient_ward, recipient_address_line, note, status,
       subtotal, shipping_fee, grand_total, completed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
     RETURNING id`,
    [
      orderDefinition.code,
      customerId,
      recipient.fullName,
      recipient.phone,
      recipient.province,
      recipient.district,
      recipient.ward,
      recipient.addressLine,
      "Đơn dữ liệu mẫu",
      orderDefinition.status,
      subtotal,
      context.shippingFee,
      grandTotal,
      completedAt,
      baseChangedAt,
    ],
  );
  const orderId = orderResult.rows[0].id;

  await client.query(
    `INSERT INTO order_items
      (order_id, product_id, product_variant_id, product_name, brand_name,
       size_value, color_name, image_path, unit_price, quantity, line_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      orderId,
      product.id,
      variant.id,
      product.name,
      product.brandName,
      variant.sizeValue,
      variant.colorName,
      product.imagePath,
      unitPrice,
      quantity,
      subtotal,
    ],
  );

  const path = statusPaths[orderDefinition.status];
  for (let pathIndex = 0; pathIndex < path.length; pathIndex += 1) {
    const toStatus = path[pathIndex];
    const fromStatus = pathIndex === 0 ? null : path[pathIndex - 1];
    const isCreation = pathIndex === 0;
    const actorType = isCreation ? (customerId ? "customer" : "guest") : "admin";

    await client.query(
      `INSERT INTO order_status_history
        (order_id, from_status, to_status, actor_type, actor_customer_id,
         actor_admin_id, actor_name, note, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        orderId,
        fromStatus,
        toStatus,
        actorType,
        actorType === "customer" ? customerId : null,
        actorType === "admin" ? context.adminId : null,
        actorType === "admin" ? context.adminName : recipient.fullName,
        "Lịch sử dữ liệu mẫu",
        new Date(baseChangedAt.getTime() + pathIndex * 60000),
      ],
    );
  }
}

async function copySeedImages(uploadDirectory) {
  await mkdir(uploadDirectory, { recursive: true });

  for (const product of products) {
    await copyFile(sampleImagePath, join(uploadDirectory, product.imagePath));
  }
}

export async function seedDatabase({
  databasePool = pool,
  uploadDirectory = env.UPLOAD_DIR,
  adminEmail = env.ADMIN_SEED_EMAIL,
  adminPassword = env.ADMIN_SEED_PASSWORD,
  customerPassword = "Customer123!",
  shippingFee = env.SHIPPING_FEE_VND,
} = {}) {
  const adminName = "Quản trị viên SẢI";
  const [adminPasswordHash, customerPasswordHash] = await Promise.all([
    argon2.hash(adminPassword, { type: argon2.argon2id }),
    argon2.hash(customerPassword, { type: argon2.argon2id }),
  ]);

  await copySeedImages(uploadDirectory);

  await withTransaction(async (client) => {
    const lookupIds = {
      categories: new Map(),
      brands: new Map(),
      sizes: new Map(),
      colors: new Map(),
    };

    for (const category of categories) {
      lookupIds.categories.set(category, await upsertNamedLookup(client, "categories", "name", category));
    }
    for (const brand of brands) {
      lookupIds.brands.set(brand, await upsertNamedLookup(client, "brands", "name", brand));
    }
    for (const size of sizes) {
      lookupIds.sizes.set(size, await upsertNamedLookup(client, "sizes", "value", size));
    }
    for (const color of colors) {
      lookupIds.colors.set(color.name, await upsertColor(client, color));
    }

    const adminId = await upsertAdmin(client, adminPasswordHash, adminEmail, adminName);
    const customerIds = await upsertCustomers(client, customerPasswordHash);
    const seededProducts = await upsertProducts(client, lookupIds);

    for (let index = 0; index < seedOrders.length; index += 1) {
      await createSeedOrder(client, seedOrders[index], index, {
        adminId,
        adminName,
        customerIds,
        seededProducts,
        shippingFee,
      });
    }
  }, databasePool);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  try {
    await seedDatabase();
  } finally {
    await pool.end();
  }
}
