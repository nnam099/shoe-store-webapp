import { toPublicImagePath } from "./product-image.js";

export function toProductSummary(row) {
  const totalStock = Number(row.total_stock);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: { id: row.category_id, name: row.category_name },
    brand: { id: row.brand_id, name: row.brand_name },
    price: Number(row.price),
    salePrice: row.sale_price === null ? null : Number(row.sale_price),
    effectivePrice: Number(row.sale_price ?? row.price),
    badgeLabel: row.badge_label,
    mainImage: row.image_path ? toPublicImagePath(row.image_path) : null,
    totalStock,
    inStock: totalStock > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStorefrontProductSummary(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: { id: row.category_id, name: row.category_name },
    brand: { id: row.brand_id, name: row.brand_name },
    price: Number(row.price),
    salePrice: row.sale_price === null ? null : Number(row.sale_price),
    effectivePrice: Number(row.sale_price ?? row.price),
    badgeLabel: row.badge_label,
    mainImage: row.image_path ? toPublicImagePath(row.image_path) : null,
    inStock: row.in_stock === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStorefrontProductDetail(row, images, variants) {
  const inStock = variants.some((variant) => variant.stock_quantity > 0);
  return {
    ...toStorefrontProductSummary({
      ...row,
      image_path: images[0]?.image_path ?? null,
      in_stock: inStock,
    }),
    description: row.description,
    material: row.material,
    images: images.map((image) => ({
      id: image.id,
      path: toPublicImagePath(image.image_path),
      position: image.position,
    })),
    variants: variants.map((variant) => ({
      id: variant.id,
      size: { id: variant.size_id, value: variant.size_value },
      color: { id: variant.color_id, name: variant.color_name, hexCode: variant.hex_code },
      stockQuantity: variant.stock_quantity,
      inStock: variant.stock_quantity > 0,
    })),
  };
}

export function toProductDetail(row, images, variants) {
  return {
    ...toProductSummary({
      ...row,
      image_path: images[0]?.image_path ?? null,
      total_stock: variants.reduce((sum, item) => sum + item.stock_quantity, 0),
    }),
    description: row.description,
    material: row.material,
    images: images.map((image) => ({
      id: image.id,
      path: toPublicImagePath(image.image_path),
      position: image.position,
    })),
    variants: variants.map((variant) => ({
      id: variant.id,
      size: { id: variant.size_id, value: variant.size_value },
      color: { id: variant.color_id, name: variant.color_name, hexCode: variant.hex_code },
      stockQuantity: variant.stock_quantity,
      inStock: variant.stock_quantity > 0,
    })),
  };
}
