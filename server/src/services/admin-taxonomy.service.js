import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
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
} from '../utils/adminValidation.js';
import { deleteManagedImage, saveManagedImage } from '../utils/managedImages.js';

const SORTS = ['name-asc', 'name-desc', 'newest', 'oldest'];
const orderMap = {
  'name-asc': { name: 'asc' }, 'name-desc': { name: 'desc' },
  newest: { createdAt: 'desc' }, oldest: { createdAt: 'asc' },
};

function notFound(kind) {
  return new AppError(`Không tìm thấy ${kind}.`, 404, `${kind.toUpperCase()}_NOT_FOUND`);
}

function slugExists(kind) {
  return new AppError(`Slug ${kind} đã tồn tại.`, 409, `${kind.toUpperCase()}_SLUG_EXISTS`);
}

function serializeBrand(brand) {
  return {
    id: brand.id, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl,
    isActive: brand.isActive, productCount: brand._count?.products,
    deletable: brand._count ? brand._count.products === 0 : undefined,
    createdAt: brand.createdAt, updatedAt: brand.updatedAt,
  };
}

function serializeCategory(category) {
  return {
    id: category.id, name: category.name, slug: category.slug,
    isActive: category.isActive, productCount: category._count?.productCategories,
    deletable: category._count ? category._count.productCategories === 0 : undefined,
    createdAt: category.createdAt, updatedAt: category.updatedAt,
  };
}

function parseListQuery(query) {
  const { page, limit } = parsePagination(query);
  return {
    page, limit,
    q: parseSearch(query.q),
    isActive: parseBoolean(query.isActive, 'isActive'),
    sort: parseEnum(query.sort, SORTS, 'sort', 'name-asc'),
  };
}

export async function listBrands(query) {
  const filters = parseListQuery(query);
  const where = {
    ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
    ...(filters.q ? { OR: [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { slug: { contains: filters.q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [items, totalItems] = await prisma.$transaction([
    prisma.brand.findMany({ where, include: { _count: { select: { products: true } } }, orderBy: [orderMap[filters.sort], { id: 'asc' }], skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    prisma.brand.count({ where }),
  ]);
  return { items: items.map(serializeBrand), pagination: paginationResult(filters.page, filters.limit, totalItems) };
}

export async function getBrand(rawId) {
  const id = parseId(rawId, 'brandId');
  const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!brand) throw notFound('brand');
  return serializeBrand(brand);
}

function brandData(input, partial) {
  assertAllowedFields(input, ['name', 'slug', 'logoUrl', 'isActive']);
  const data = {};
  if (!partial || Object.hasOwn(input, 'name')) data.name = normalizeRequiredText(input.name, 'name', 100);
  if (!partial || Object.hasOwn(input, 'slug')) data.slug = normalizeSlug(input.slug, 'slug', 100);
  if (Object.hasOwn(input, 'logoUrl')) {
    data.logoUrl = normalizeNullableText(input.logoUrl, 'logoUrl', 255);
    if (
      data.logoUrl
      && (
        !/^\/?[A-Za-z0-9/_.-]+$/.test(data.logoUrl)
        || data.logoUrl.includes('..')
        || data.logoUrl.startsWith('/api/uploads/')
      )
    ) {
      throw new AppError('logoUrl must be a safe application-relative path.', 400, 'VALIDATION_ERROR');
    }
  }
  if (Object.hasOwn(input, 'isActive')) data.isActive = parseBoolean(input.isActive, 'isActive');
  return data;
}

export async function createBrand(input) {
  try {
    return serializeBrand(await prisma.brand.create({ data: brandData(input, false), include: { _count: { select: { products: true } } } }));
  } catch (error) {
    if (error?.code === 'P2002') throw slugExists('brand');
    throw error;
  }
}

export async function updateBrand(rawId, input) {
  const id = parseId(rawId, 'brandId');
  try {
    const result = await prisma.brand.update({ where: { id }, data: brandData(input, true), include: { _count: { select: { products: true } } } });
    return serializeBrand(result);
  } catch (error) {
    if (error?.code === 'P2025') throw notFound('brand');
    if (error?.code === 'P2002') throw slugExists('brand');
    throw error;
  }
}

export async function deleteBrand(rawId) {
  const id = parseId(rawId, 'brandId');
  const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!brand) throw notFound('brand');
  if (brand._count.products > 0) throw new AppError('Brand đang được Product sử dụng.', 409, 'BRAND_IN_USE');
  await prisma.brand.delete({ where: { id } });
  await Promise.allSettled([deleteManagedImage(brand.logoUrl)]);
  return { deleted: true, id };
}

export async function uploadBrandLogo(rawId, file) {
  const id = parseId(rawId, 'brandId');
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw notFound('brand');
  const saved = await saveManagedImage(file, 'brands');
  try {
    const brand = await prisma.brand.update({ where: { id }, data: { logoUrl: saved.imageUrl }, include: { _count: { select: { products: true } } } });
    await Promise.allSettled([deleteManagedImage(existing.logoUrl)]);
    return serializeBrand(brand);
  } catch (error) {
    await Promise.allSettled([deleteManagedImage(saved.imageUrl)]);
    throw error;
  }
}

export async function removeBrandLogo(rawId) {
  const id = parseId(rawId, 'brandId');
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw notFound('brand');
  const brand = await prisma.brand.update({ where: { id }, data: { logoUrl: null }, include: { _count: { select: { products: true } } } });
  await Promise.allSettled([deleteManagedImage(existing.logoUrl)]);
  return serializeBrand(brand);
}

export async function listCategories(query) {
  const filters = parseListQuery(query);
  const where = {
    ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
    ...(filters.q ? { OR: [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { slug: { contains: filters.q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [items, totalItems] = await prisma.$transaction([
    prisma.category.findMany({ where, include: { _count: { select: { productCategories: true } } }, orderBy: [orderMap[filters.sort], { id: 'asc' }], skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    prisma.category.count({ where }),
  ]);
  return { items: items.map(serializeCategory), pagination: paginationResult(filters.page, filters.limit, totalItems) };
}

export async function getCategory(rawId) {
  const id = parseId(rawId, 'categoryId');
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { productCategories: true } } } });
  if (!category) throw notFound('category');
  return serializeCategory(category);
}

function categoryData(input, partial) {
  assertAllowedFields(input, ['name', 'slug', 'isActive']);
  const data = {};
  if (!partial || Object.hasOwn(input, 'name')) data.name = normalizeRequiredText(input.name, 'name', 100);
  if (!partial || Object.hasOwn(input, 'slug')) data.slug = normalizeSlug(input.slug, 'slug', 100);
  if (Object.hasOwn(input, 'isActive')) data.isActive = parseBoolean(input.isActive, 'isActive');
  return data;
}

export async function createCategory(input) {
  try {
    return serializeCategory(await prisma.category.create({ data: categoryData(input, false), include: { _count: { select: { productCategories: true } } } }));
  } catch (error) {
    if (error?.code === 'P2002') throw slugExists('category');
    throw error;
  }
}

export async function updateCategory(rawId, input) {
  const id = parseId(rawId, 'categoryId');
  try {
    return serializeCategory(await prisma.category.update({ where: { id }, data: categoryData(input, true), include: { _count: { select: { productCategories: true } } } }));
  } catch (error) {
    if (error?.code === 'P2025') throw notFound('category');
    if (error?.code === 'P2002') throw slugExists('category');
    throw error;
  }
}

export async function deleteCategory(rawId) {
  const id = parseId(rawId, 'categoryId');
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { productCategories: true } } } });
  if (!category) throw notFound('category');
  if (category._count.productCategories > 0) throw new AppError('Category đang được Product sử dụng.', 409, 'CATEGORY_IN_USE');
  await prisma.category.delete({ where: { id } });
  return { deleted: true, id };
}
