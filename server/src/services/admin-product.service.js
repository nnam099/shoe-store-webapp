import prisma from '../config/db.js';
import { CATALOG_COLOR_FAMILIES } from '../config/catalog.js';
import { AppError } from '../utils/errors.js';
import {
  COLORWAY_MAX_IMAGES,
  COLORWAY_MIN_IMAGES,
  getColorwayReadinessIssues,
  getProductReadinessIssues,
  validateColorFamilies,
  validatePrices,
} from '../utils/catalogPolicy.js';
import {
  assertAllowedFields,
  normalizeNullableText,
  normalizeRequiredText,
  normalizeSlug,
  paginationResult,
  parseBoolean,
  parseEnum,
  parseId,
  parsePagination,
  parseSearch,
  validationError,
} from '../utils/adminValidation.js';
import { deleteManagedImage, saveManagedImage } from '../utils/managedImages.js';

const PRODUCT_SORTS = ['newest', 'oldest', 'name-asc', 'name-desc', 'updated-desc'];
const productOrderMap = {
  newest: { createdAt: 'desc' }, oldest: { createdAt: 'asc' },
  'name-asc': { name: 'asc' }, 'name-desc': { name: 'desc' },
  'updated-desc': { updatedAt: 'desc' },
};

const fullProductInclude = {
  brand: true,
  productCategories: { include: { category: true }, orderBy: { categoryId: 'asc' } },
  colorways: {
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    include: {
      images: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      variants: {
        orderBy: [{ size: 'asc' }, { id: 'asc' }],
        include: { _count: { select: { orderItems: true } } },
      },
    },
  },
  _count: { select: { reviews: true } },
};

function entityNotFound(entity) {
  return new AppError(`Không tìm thấy ${entity}.`, 404, `${entity.toUpperCase()}_NOT_FOUND`);
}

function conflict(code, message, details) {
  return new AppError(message, 409, code, undefined, details);
}

function serializeImage(image) {
  return {
    id: image.id, imageUrl: image.imageUrl, displayOrder: image.displayOrder,
    isThumbnail: image.isThumbnail, createdAt: image.createdAt,
  };
}

function serializeVariant(variant) {
  return {
    id: variant.id, size: variant.size, stock: variant.stock,
    hasOrderHistory: (variant._count?.orderItems ?? 0) > 0,
    deletable: (variant._count?.orderItems ?? 0) === 0,
    createdAt: variant.createdAt, updatedAt: variant.updatedAt,
  };
}

function serializeColorway(colorway) {
  const hasOrderHistory = (colorway.variants ?? []).some((variant) => (variant._count?.orderItems ?? 0) > 0);
  return {
    id: colorway.id, productId: colorway.productId, name: colorway.name, slug: colorway.slug,
    colorFamilies: colorway.colorFamilies, price: Number(colorway.price),
    salePrice: colorway.salePrice === null ? null : Number(colorway.salePrice),
    isDefault: colorway.isDefault, isActive: colorway.isActive,
    images: (colorway.images ?? []).map(serializeImage),
    variants: (colorway.variants ?? []).map(serializeVariant),
    readinessIssues: getColorwayReadinessIssues(colorway),
    hasOrderHistory,
    deletable: !colorway.isDefault && !hasOrderHistory,
    createdAt: colorway.createdAt, updatedAt: colorway.updatedAt,
  };
}

function serializeProduct(product) {
  const colorways = product.colorways ?? [];
  const hasOrderHistory = colorways.some((colorway) => colorway.variants.some(
    (variant) => (variant._count?.orderItems ?? 0) > 0
  ));
  const reviewCount = product._count?.reviews ?? 0;
  return {
    id: product.id, name: product.name, slug: product.slug,
    description: product.description, isActive: product.isActive,
    isFeatured: product.isFeatured, createdAt: product.createdAt, updatedAt: product.updatedAt,
    brand: product.brand ? {
      id: product.brand.id, name: product.brand.name, slug: product.brand.slug,
      isActive: product.brand.isActive,
    } : null,
    categories: (product.productCategories ?? []).map(({ category }) => ({
      id: category.id, name: category.name, slug: category.slug, isActive: category.isActive,
    })),
    colorways: colorways.map(serializeColorway),
    reviewCount,
    hasOrderHistory,
    deletable: !hasOrderHistory && reviewCount === 0,
    readinessIssues: getProductReadinessIssues(product),
  };
}

async function loadProduct(db, id) {
  return db.product.findUnique({ where: { id }, include: fullProductInclude });
}

function assertProductReady(product) {
  const issues = getProductReadinessIssues(product);
  if (issues.length) throw new AppError('Product chưa đủ điều kiện hiển thị.', 409, 'PRODUCT_NOT_READY', issues);
}

function parseIdArray(value, field, { minimum = 1 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > 100) {
    throw validationError(`${field} must be an array containing ${minimum} to 100 IDs`);
  }
  const ids = value.map((item) => parseId(item, field));
  if (new Set(ids).size !== ids.length) throw validationError(`${field} must not contain duplicates`);
  return ids;
}

async function assertBrandAndCategories(db, brandId, categoryIds) {
  const [brand, categoryCount] = await Promise.all([
    db.brand.findUnique({ where: { id: brandId } }),
    db.category.count({ where: { id: { in: categoryIds } } }),
  ]);
  if (!brand) throw entityNotFound('brand');
  if (categoryCount !== categoryIds.length) throw validationError('categoryIds contains an unknown Category');
}

export function getAdminCatalogMeta() {
  return {
    colorFamilies: CATALOG_COLOR_FAMILIES,
    imageRules: {
      fieldName: 'image', formats: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 8 * 1024 * 1024, minPerPublishableColorway: COLORWAY_MIN_IMAGES,
      maxPerColorway: COLORWAY_MAX_IMAGES,
    },
    productSorts: PRODUCT_SORTS,
    pagination: { defaultLimit: 20, maxLimit: 100 },
  };
}

export async function listProducts(query) {
  const { page, limit } = parsePagination(query);
  const q = parseSearch(query.q);
  const isActive = parseBoolean(query.isActive, 'isActive');
  const isFeatured = parseBoolean(query.isFeatured, 'isFeatured');
  const sort = parseEnum(query.sort, PRODUCT_SORTS, 'sort', 'newest');
  const brandId = query.brandId === undefined ? null : parseId(query.brandId, 'brandId');
  const categoryId = query.categoryId === undefined ? null : parseId(query.categoryId, 'categoryId');
  const where = {
    ...(q ? { OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ] } : {}),
    ...(isActive === undefined ? {} : { isActive }),
    ...(isFeatured === undefined ? {} : { isFeatured }),
    ...(brandId ? { brandId } : {}),
    ...(categoryId ? { productCategories: { some: { categoryId } } } : {}),
  };
  const [items, totalItems] = await prisma.$transaction([
    prisma.product.findMany({ where, include: fullProductInclude, orderBy: [productOrderMap[sort], { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  return { items: items.map(serializeProduct), pagination: paginationResult(page, limit, totalItems) };
}

export async function getProduct(rawId) {
  const id = parseId(rawId, 'productId');
  const product = await loadProduct(prisma, id);
  if (!product) throw entityNotFound('product');
  return serializeProduct(product);
}

export async function createProduct(input) {
  assertAllowedFields(input, ['name', 'slug', 'brandId', 'description', 'categoryIds', 'isFeatured', 'isActive']);
  const name = normalizeRequiredText(input.name, 'name', 200);
  const slug = normalizeSlug(input.slug, 'slug', 200);
  const brandId = parseId(input.brandId, 'brandId');
  const description = normalizeNullableText(input.description, 'description');
  const categoryIds = parseIdArray(input.categoryIds, 'categoryIds');
  const isFeatured = parseBoolean(input.isFeatured, 'isFeatured', false);
  const requestedActive = parseBoolean(input.isActive, 'isActive', false);
  if (requestedActive) throw conflict('PRODUCT_NOT_READY', 'Product mới phải được tạo dưới dạng bản nháp Inactive.');
  await assertBrandAndCategories(prisma, brandId, categoryIds);
  try {
    const product = await prisma.product.create({
      data: {
        name, slug, brandId, description, isFeatured, isActive: false,
        productCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
      include: fullProductInclude,
    });
    return serializeProduct(product);
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('PRODUCT_SLUG_EXISTS', 'Slug Product đã tồn tại.');
    throw error;
  }
}

export async function updateProduct(rawId, input) {
  const id = parseId(rawId, 'productId');
  assertAllowedFields(input, ['name', 'slug', 'brandId', 'description', 'categoryIds', 'isActive', 'isFeatured']);
  const data = {};
  if (Object.hasOwn(input, 'name')) data.name = normalizeRequiredText(input.name, 'name', 200);
  if (Object.hasOwn(input, 'slug')) data.slug = normalizeSlug(input.slug, 'slug', 200);
  if (Object.hasOwn(input, 'brandId')) data.brandId = parseId(input.brandId, 'brandId');
  if (Object.hasOwn(input, 'description')) data.description = normalizeNullableText(input.description, 'description');
  if (Object.hasOwn(input, 'isActive')) data.isActive = parseBoolean(input.isActive, 'isActive');
  if (Object.hasOwn(input, 'isFeatured')) data.isFeatured = parseBoolean(input.isFeatured, 'isFeatured');
  const categoryIds = Object.hasOwn(input, 'categoryIds') ? parseIdArray(input.categoryIds, 'categoryIds') : null;
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) throw entityNotFound('product');
      await assertBrandAndCategories(tx, data.brandId ?? current.brandId, categoryIds ?? (
        await tx.productCategory.findMany({ where: { productId: id }, select: { categoryId: true } })
      ).map((row) => row.categoryId));
      await tx.product.update({ where: { id }, data });
      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId: id, categoryId })) });
      }
      const updated = await loadProduct(tx, id);
      if (updated.isActive) assertProductReady(updated);
      return serializeProduct(updated);
    });
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('PRODUCT_SLUG_EXISTS', 'Slug Product đã tồn tại.');
    throw error;
  }
}

export async function deleteProduct(rawId) {
  const id = parseId(rawId, 'productId');
  const product = await loadProduct(prisma, id);
  if (!product) throw entityNotFound('product');
  const hasHistory = product.colorways.some((colorway) => colorway.variants.some(
    (variant) => variant._count.orderItems > 0
  ));
  if (hasHistory || product._count.reviews > 0) {
    throw conflict('PRODUCT_IN_USE', 'Product có lịch sử đơn hàng hoặc Review; hãy chuyển sang Inactive.');
  }
  const imageUrls = product.colorways.flatMap((colorway) => colorway.images.map((image) => image.imageUrl));
  await prisma.$transaction(async (tx) => {
    await tx.variant.deleteMany({ where: { colorway: { productId: id } } });
    await tx.colorway.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
  await Promise.allSettled(imageUrls.map(deleteManagedImage));
  return { deleted: true, id };
}

export async function getColorway(rawId) {
  const id = parseId(rawId, 'colorwayId');
  const colorway = await prisma.colorway.findUnique({
    where: { id },
    include: { images: { orderBy: { displayOrder: 'asc' } }, variants: { orderBy: { size: 'asc' }, include: { _count: { select: { orderItems: true } } } } },
  });
  if (!colorway) throw entityNotFound('colorway');
  return serializeColorway(colorway);
}

export async function createColorway(rawProductId, input) {
  const productId = parseId(rawProductId, 'productId');
  assertAllowedFields(input, ['name', 'slug', 'colorFamilies', 'price', 'salePrice', 'isActive']);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw entityNotFound('product');
  if (parseBoolean(input.isActive, 'isActive', false)) {
    throw conflict('COLORWAY_NOT_READY', 'Colorway mới phải được tạo dưới dạng bản nháp Inactive.');
  }
  const prices = validatePrices(input.price, input.salePrice);
  try {
    const colorway = await prisma.colorway.create({
      data: {
        productId, name: normalizeRequiredText(input.name, 'name', 100),
        slug: normalizeSlug(input.slug, 'slug', 100),
        colorFamilies: validateColorFamilies(input.colorFamilies),
        ...prices, isActive: false, isDefault: false,
      },
      include: { images: true, variants: { include: { _count: { select: { orderItems: true } } } } },
    });
    return serializeColorway(colorway);
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('COLORWAY_SLUG_EXISTS', 'Slug Colorway đã tồn tại trong Product.');
    throw error;
  }
}

export async function updateColorway(rawId, input) {
  const id = parseId(rawId, 'colorwayId');
  assertAllowedFields(input, ['name', 'slug', 'colorFamilies', 'price', 'salePrice', 'isActive']);
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.colorway.findUnique({ where: { id } });
      if (!current) throw entityNotFound('colorway');
      const data = {};
      if (Object.hasOwn(input, 'name')) data.name = normalizeRequiredText(input.name, 'name', 100);
      if (Object.hasOwn(input, 'slug')) data.slug = normalizeSlug(input.slug, 'slug', 100);
      if (Object.hasOwn(input, 'colorFamilies')) data.colorFamilies = validateColorFamilies(input.colorFamilies);
      if (Object.hasOwn(input, 'price') || Object.hasOwn(input, 'salePrice')) {
        Object.assign(data, validatePrices(
          Object.hasOwn(input, 'price') ? input.price : Number(current.price),
          Object.hasOwn(input, 'salePrice') ? input.salePrice : (current.salePrice === null ? null : Number(current.salePrice))
        ));
      }
      if (Object.hasOwn(input, 'isActive')) {
        data.isActive = parseBoolean(input.isActive, 'isActive');
        if (!data.isActive && current.isDefault) {
          throw conflict('DEFAULT_COLORWAY_REQUIRED', 'Hãy chọn Colorway mặc định khác trước khi vô hiệu hóa.');
        }
      }
      await tx.colorway.update({ where: { id }, data });
      const product = await loadProduct(tx, current.productId);
      const updated = product.colorways.find((item) => item.id === id);
      if (updated.isActive) {
        const issues = getColorwayReadinessIssues(updated);
        if (issues.length) throw new AppError('Colorway chưa đủ điều kiện Active.', 409, 'COLORWAY_NOT_READY', issues);
      }
      if (product.isActive) assertProductReady(product);
      return serializeColorway(updated);
    });
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('COLORWAY_SLUG_EXISTS', 'Slug Colorway đã tồn tại trong Product.');
    throw error;
  }
}

export async function setDefaultColorway(rawId) {
  const id = parseId(rawId, 'colorwayId');
  return prisma.$transaction(async (tx) => {
    const target = await tx.colorway.findUnique({
      where: { id },
      include: { images: true, variants: { include: { _count: { select: { orderItems: true } } } } },
    });
    if (!target) throw entityNotFound('colorway');
    const issues = getColorwayReadinessIssues(target);
    if (issues.length) throw new AppError('Colorway chưa đủ điều kiện làm mặc định.', 409, 'COLORWAY_NOT_READY', issues);
    await tx.colorway.updateMany({ where: { productId: target.productId, isDefault: true }, data: { isDefault: false } });
    await tx.colorway.update({ where: { id }, data: { isDefault: true } });
    const product = await loadProduct(tx, target.productId);
    if (product.isActive) assertProductReady(product);
    return { productId: target.productId, defaultColorwayId: id };
  });
}

export async function deleteColorway(rawId) {
  const id = parseId(rawId, 'colorwayId');
  const target = await prisma.colorway.findUnique({
    where: { id },
    include: { images: true, variants: { include: { _count: { select: { orderItems: true } } } } },
  });
  if (!target) throw entityNotFound('colorway');
  if (target.isDefault) throw conflict('DEFAULT_COLORWAY_REQUIRED', 'Hãy chọn Colorway mặc định khác trước khi xóa.');
  if (target.variants.some((variant) => variant._count.orderItems > 0)) {
    throw conflict('COLORWAY_IN_USE', 'Colorway có lịch sử đơn hàng; hãy chuyển sang Inactive.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.variant.deleteMany({ where: { colorwayId: id } });
    await tx.colorway.delete({ where: { id } });
    const product = await loadProduct(tx, target.productId);
    if (product.isActive) assertProductReady(product);
  });
  await Promise.allSettled(target.images.map((image) => deleteManagedImage(image.imageUrl)));
  return { deleted: true, id };
}

function parseImageOrder(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const text = String(value);
  if (!/^[1-4]$/.test(text)) throw validationError('displayOrder must be between 1 and 4');
  return Number(text);
}

export async function uploadColorwayImage(rawId, body, file) {
  const colorwayId = parseId(rawId, 'colorwayId');
  const existing = await prisma.colorway.findUnique({ where: { id: colorwayId }, include: { images: true } });
  if (!existing) throw entityNotFound('colorway');
  if (existing.images.length >= COLORWAY_MAX_IMAGES) throw conflict('IMAGE_LIMIT_REACHED', 'Colorway chỉ hỗ trợ tối đa 4 ảnh.');
  const displayOrder = parseImageOrder(body?.displayOrder, existing.images.length + 1);
  if (existing.images.some((image) => image.displayOrder === displayOrder)) {
    throw conflict('IMAGE_ORDER_CONFLICT', 'displayOrder đã được sử dụng.');
  }
  const isThumbnail = parseBoolean(body?.isThumbnail, 'isThumbnail', existing.images.length === 0);
  const saved = await saveManagedImage(file, 'products');
  try {
    const image = await prisma.$transaction(async (tx) => {
      if (isThumbnail) await tx.productImage.updateMany({ where: { colorwayId }, data: { isThumbnail: false } });
      return tx.productImage.create({ data: { colorwayId, imageUrl: saved.imageUrl, displayOrder, isThumbnail } });
    });
    return serializeImage(image);
  } catch (error) {
    await Promise.allSettled([deleteManagedImage(saved.imageUrl)]);
    throw error;
  }
}

export async function reorderColorwayImages(rawId, input) {
  const colorwayId = parseId(rawId, 'colorwayId');
  assertAllowedFields(input, ['images', 'thumbnailImageId']);
  if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > COLORWAY_MAX_IMAGES) {
    throw validationError('images must contain the complete ordered image set');
  }
  const rows = input.images.map((row) => {
    assertAllowedFields(row, ['id', 'displayOrder']);
    return { id: parseId(row.id, 'imageId'), displayOrder: parseImageOrder(row.displayOrder) };
  });
  if (new Set(rows.map((row) => row.id)).size !== rows.length || new Set(rows.map((row) => row.displayOrder)).size !== rows.length) {
    throw validationError('Image IDs and displayOrder values must be unique');
  }
  const expectedOrders = rows.map((row) => row.displayOrder).sort().join(',');
  if (expectedOrders !== Array.from({ length: rows.length }, (_, index) => index + 1).join(',')) {
    throw validationError('displayOrder values must form a continuous sequence from 1');
  }
  const thumbnailImageId = parseId(input.thumbnailImageId, 'thumbnailImageId');
  if (!rows.some((row) => row.id === thumbnailImageId)) throw validationError('thumbnailImageId must belong to images');
  return prisma.$transaction(async (tx) => {
    const colorway = await tx.colorway.findUnique({ where: { id: colorwayId }, include: { images: true } });
    if (!colorway) throw entityNotFound('colorway');
    if (colorway.images.length !== rows.length || colorway.images.some((image) => !rows.some((row) => row.id === image.id))) {
      throw validationError('images must contain every image owned by this Colorway');
    }
    await tx.productImage.updateMany({ where: { colorwayId }, data: { isThumbnail: false } });
    for (let index = 0; index < rows.length; index += 1) {
      await tx.productImage.update({ where: { id: rows[index].id }, data: { displayOrder: -(index + 1) } });
    }
    for (const row of rows) {
      await tx.productImage.update({ where: { id: row.id }, data: { displayOrder: row.displayOrder } });
    }
    await tx.productImage.update({ where: { id: thumbnailImageId }, data: { isThumbnail: true } });
    const product = await loadProduct(tx, colorway.productId);
    if (product.isActive) assertProductReady(product);
    return product.colorways.find((item) => item.id === colorwayId).images.map(serializeImage);
  });
}

export async function deleteProductImage(rawId) {
  const id = parseId(rawId, 'imageId');
  const image = await prisma.productImage.findUnique({ where: { id }, include: { colorway: true } });
  if (!image) throw entityNotFound('image');
  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id } });
    const product = await loadProduct(tx, image.colorway.productId);
    if (product.isActive) assertProductReady(product);
  });
  await Promise.allSettled([deleteManagedImage(image.imageUrl)]);
  return { deleted: true, id };
}

function parseStock(value, field = 'stock') {
  if (!Number.isSafeInteger(value) || value < 0) throw validationError(`${field} must be a non-negative integer`);
  return value;
}

function normalizeSize(value) {
  return normalizeRequiredText(value, 'size', 10);
}

export async function createVariant(rawColorwayId, input) {
  const colorwayId = parseId(rawColorwayId, 'colorwayId');
  assertAllowedFields(input, ['size', 'stock']);
  if (!await prisma.colorway.findUnique({ where: { id: colorwayId }, select: { id: true } })) throw entityNotFound('colorway');
  try {
    return serializeVariant(await prisma.variant.create({
      data: { colorwayId, size: normalizeSize(input.size), stock: parseStock(input.stock) },
      include: { _count: { select: { orderItems: true } } },
    }));
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('VARIANT_SIZE_EXISTS', 'Size đã tồn tại trong Colorway.');
    throw error;
  }
}

export async function updateVariant(rawId, input) {
  const id = parseId(rawId, 'variantId');
  assertAllowedFields(input, ['size']);
  const size = normalizeSize(input.size);
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.variant.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
      if (!current) throw entityNotFound('variant');
      if (current._count.orderItems > 0 && current.size !== size) {
        throw conflict('VARIANT_IN_USE', 'Không thể đổi size của Variant có lịch sử đơn hàng.');
      }
      const variant = await tx.variant.update({ where: { id }, data: { size }, include: { _count: { select: { orderItems: true } } } });
      return serializeVariant(variant);
    });
  } catch (error) {
    if (error?.code === 'P2002') throw conflict('VARIANT_SIZE_EXISTS', 'Size đã tồn tại trong Colorway.');
    throw error;
  }
}

export async function updateVariantStock(rawId, input) {
  const id = parseId(rawId, 'variantId');
  assertAllowedFields(input, ['stock', 'expectedStock']);
  const stock = parseStock(input.stock);
  const expectedStock = parseStock(input.expectedStock, 'expectedStock');
  const result = await prisma.variant.updateMany({ where: { id, stock: expectedStock }, data: { stock } });
  if (result.count === 0) {
    const current = await prisma.variant.findUnique({ where: { id }, select: { stock: true } });
    if (!current) throw entityNotFound('variant');
    throw conflict('STOCK_CONFLICT', 'Tồn kho vừa thay đổi. Vui lòng tải lại dữ liệu.', { currentStock: current.stock });
  }
  return serializeVariant(await prisma.variant.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } }));
}

export async function deleteVariant(rawId) {
  const id = parseId(rawId, 'variantId');
  const current = await prisma.variant.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!current) throw entityNotFound('variant');
  if (current._count.orderItems > 0) throw conflict('VARIANT_IN_USE', 'Variant có lịch sử đơn hàng; hãy đặt stock về 0.');
  await prisma.$transaction(async (tx) => {
    await tx.variant.delete({ where: { id } });
    const colorway = await tx.colorway.findUnique({ where: { id: current.colorwayId }, select: { productId: true } });
    const product = await loadProduct(tx, colorway.productId);
    if (product.isActive) assertProductReady(product);
  });
  return { deleted: true, id };
}
