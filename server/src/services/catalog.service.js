import prisma from '../config/db.js';
import {
  CATALOG_COLOR_FAMILIES,
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_PAGE,
  CATALOG_MAX_LIMIT,
  CATALOG_SORTS,
} from '../config/catalog.js';
import { AppError } from '../utils/errors.js';
import { listCompletedProductSales } from './product-sales.service.js';

const PRODUCT_SLUG_MAX_LENGTH = 200;
const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILTER_TOKEN_MAX_LENGTH = 100;
const MAX_FILTER_VALUES = 50;
const MAX_PRICE = 999_999_999_999;

const publicProductWhere = Object.freeze({
  isActive: true,
  brand: { isActive: true },
  colorways: {
    some: {
      isActive: true,
      isDefault: true,
    },
  },
});

const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isFeatured: true,
  createdAt: true,
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  productCategories: {
    where: { category: { isActive: true } },
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  colorways: {
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      colorFamilies: true,
      isDefault: true,
      images: {
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          imageUrl: true,
          isThumbnail: true,
        },
      },
      variants: {
        select: {
          size: true,
          stock: true,
        },
      },
    },
  },
};

function validationError(message, issues) {
  return new AppError(message, 400, 'VALIDATION_ERROR', issues);
}

function productNotFoundError() {
  return new AppError('Không tìm thấy sản phẩm.', 404, 'PRODUCT_NOT_FOUND');
}

function normalizeText(value) {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function parseSearch(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw validationError('q must be a string');
  const normalized = value.trim();
  if (normalized.length > PRODUCT_SLUG_MAX_LENGTH) {
    throw validationError(`q must not exceed ${PRODUCT_SLUG_MAX_LENGTH} characters`);
  }
  return normalizeText(normalized);
}

function parseCsv(value, field, { slug = false } = {}) {
  if (value === undefined || value === '') return [];
  if (typeof value !== 'string') {
    throw validationError(`${field} must be a comma-separated string`);
  }

  const values = [];
  const seen = new Set();
  for (const rawValue of value.split(',')) {
    const normalized = rawValue.trim().toLowerCase();
    if (!normalized) continue;
    if (
      normalized.length > FILTER_TOKEN_MAX_LENGTH
      || (slug && !PRODUCT_SLUG_PATTERN.test(normalized))
    ) {
      throw validationError(`${field} contains an invalid value`);
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  }

  if (values.length > MAX_FILTER_VALUES) {
    throw validationError(`${field} accepts at most ${MAX_FILTER_VALUES} values`);
  }
  return values;
}

function parsePositiveInteger(value, fallback, field, maximum = null) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`${field} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum !== null && parsed > maximum)) {
    throw validationError(
      maximum === null
        ? `${field} must be a positive integer`
        : `${field} must be between 1 and ${maximum}`
    );
  }
  return parsed;
}

function parsePrice(value, field) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`${field} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_PRICE) {
    throw validationError(`${field} must be between 0 and ${MAX_PRICE}`);
  }
  return parsed;
}

function parseFeatured(value) {
  if (value === undefined) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw validationError('featured must be true or false');
}

function parseSort(value) {
  if (value === undefined) return 'newest';
  if (typeof value !== 'string' || !CATALOG_SORTS.includes(value)) {
    throw validationError(`sort must be one of: ${CATALOG_SORTS.join(', ')}`);
  }
  return value;
}

export function parseCatalogQuery(query = {}) {
  const minPrice = parsePrice(query.minPrice, 'minPrice');
  const maxPrice = parsePrice(query.maxPrice, 'maxPrice');
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw validationError('minPrice must not exceed maxPrice');
  }

  return {
    q: parseSearch(query.q),
    brands: parseCsv(query.brand, 'brand', { slug: true }),
    categories: parseCsv(query.category, 'category', { slug: true }),
    colors: parseCsv(query.color, 'color', { slug: true }),
    sizes: parseCsv(query.size, 'size'),
    minPrice,
    maxPrice,
    sort: parseSort(query.sort),
    featured: parseFeatured(query.featured),
    page: parsePositiveInteger(query.page, CATALOG_DEFAULT_PAGE, 'page'),
    limit: parsePositiveInteger(
      query.limit,
      CATALOG_DEFAULT_LIMIT,
      'limit',
      CATALOG_MAX_LIMIT
    ),
  };
}

function effectivePrice(colorway) {
  return Number(colorway.salePrice ?? colorway.price);
}

function getDefaultColorway(product) {
  return product.colorways.find((colorway) => colorway.isDefault) ?? null;
}

function getThumbnail(colorway) {
  return colorway.images.find((image) => image.isThumbnail)?.imageUrl
    ?? colorway.images[0]?.imageUrl
    ?? null;
}

function colorwayMatchesColors(colorway, selectedColors) {
  return selectedColors.some((selectedColor) => colorway.colorFamilies.includes(selectedColor));
}

function colorwayHasAvailableSize(colorway, selectedSizes) {
  return colorway.variants.some(
    (variant) => selectedSizes.includes(variant.size.toLowerCase()) && variant.stock > 0
  );
}

function colorwayMatchesPrice(colorway, minPrice, maxPrice) {
  const price = effectivePrice(colorway);
  return (minPrice === null || price >= minPrice) && (maxPrice === null || price <= maxPrice);
}

function productMatchesFilters(product, filters) {
  const defaultColorway = getDefaultColorway(product);
  if (!defaultColorway) return null;

  if (filters.q && !normalizeText(product.name).includes(filters.q)) return null;
  if (filters.featured !== null && product.isFeatured !== filters.featured) return null;
  if (filters.brands.length > 0 && !filters.brands.includes(product.brand.slug)) return null;

  const categorySlugs = product.productCategories.map(({ category }) => category.slug);
  if (
    filters.categories.length > 0
    && !filters.categories.some((category) => categorySlugs.includes(category))
  ) {
    return null;
  }

  if (filters.colors.length === 0) {
    if (
      filters.sizes.length > 0
      && !product.colorways.some((colorway) => colorwayHasAvailableSize(colorway, filters.sizes))
    ) {
      return null;
    }
    return colorwayMatchesPrice(defaultColorway, filters.minPrice, filters.maxPrice)
      ? defaultColorway
      : null;
  }

  const candidates = product.colorways.filter((colorway) => (
    colorwayMatchesColors(colorway, filters.colors)
    && (
      filters.sizes.length === 0
      || colorwayHasAvailableSize(colorway, filters.sizes)
    )
    && colorwayMatchesPrice(colorway, filters.minPrice, filters.maxPrice)
  ));

  if (candidates.length === 0) return null;
  return candidates.find((colorway) => colorway.id === defaultColorway.id) ?? candidates[0];
}

function compareProducts(left, right, sort) {
  let comparison = 0;
  switch (sort) {
    case 'oldest':
      comparison = left.product.createdAt.getTime() - right.product.createdAt.getTime();
      break;
    case 'price-asc':
      comparison = effectivePrice(left.displayColorway) - effectivePrice(right.displayColorway);
      break;
    case 'price-desc':
      comparison = effectivePrice(right.displayColorway) - effectivePrice(left.displayColorway);
      break;
    case 'name-asc':
      comparison = left.product.name.localeCompare(right.product.name, 'vi', {
        sensitivity: 'base',
      });
      break;
    case 'name-desc':
      comparison = right.product.name.localeCompare(left.product.name, 'vi', {
        sensitivity: 'base',
      });
      break;
    case 'newest':
    default:
      comparison = right.product.createdAt.getTime() - left.product.createdAt.getTime();
      break;
  }

  return comparison || left.product.slug.localeCompare(right.product.slug, 'en');
}

function serializeCategories(product) {
  return product.productCategories
    .map(({ category }) => ({ slug: category.slug, name: category.name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
}

function serializeCardColorway(colorway) {
  const price = Number(colorway.price);
  const salePrice = colorway.salePrice === null ? null : Number(colorway.salePrice);
  return {
    slug: colorway.slug,
    name: colorway.name,
    price,
    salePrice,
    effectivePrice: salePrice ?? price,
    thumbnail: getThumbnail(colorway),
  };
}

async function loadReviewSummaries(products) {
  if (products.length === 0) return new Map();
  const aggregates = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: products.map((product) => product.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    aggregates.map((aggregate) => [
      aggregate.productId,
      {
        averageRating: aggregate._avg.rating,
        reviewCount: aggregate._count._all,
      },
    ])
  );
}

function emptyReviewSummary() {
  return { averageRating: null, reviewCount: 0 };
}

function serializeProductCard(entry, reviewSummaries) {
  const { product, displayColorway } = entry;
  const defaultColorway = getDefaultColorway(product);
  return {
    slug: product.slug,
    name: product.name,
    brand: { slug: product.brand.slug, name: product.brand.name },
    categories: serializeCategories(product),
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    defaultColorwaySlug: defaultColorway.slug,
    displayColorway: serializeCardColorway(displayColorway),
    reviewSummary: reviewSummaries.get(product.id) ?? emptyReviewSummary(),
  };
}

function sortVariants(variants) {
  return [...variants].sort((left, right) => (
    left.size.localeCompare(right.size, 'en', { numeric: true, sensitivity: 'base' })
  ));
}

function serializeDetailColorway(colorway) {
  return {
    ...serializeCardColorway(colorway),
    isDefault: colorway.isDefault,
    images: colorway.images.map((image) => image.imageUrl),
    variants: sortVariants(colorway.variants).map((variant) => ({
      size: variant.size,
      stock: variant.stock,
    })),
  };
}

async function findPublicProducts() {
  return prisma.product.findMany({
    where: publicProductWhere,
    orderBy: { id: 'asc' },
    select: publicProductSelect,
  });
}

export async function getCatalogOptions() {
  const [brands, categories, products] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, slug: true, name: true, logoUrl: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, slug: true, name: true },
    }),
    findPublicProducts(),
  ]);

  const brandCounts = new Map();
  const categoryCounts = new Map();
  const presentColorFamilies = new Set();
  const sizes = new Set();
  const defaultPrices = [];

  for (const product of products) {
    brandCounts.set(product.brand.id, (brandCounts.get(product.brand.id) ?? 0) + 1);
    for (const { category } of product.productCategories) {
      categoryCounts.set(category.id, (categoryCounts.get(category.id) ?? 0) + 1);
    }
    for (const colorway of product.colorways) {
      colorway.colorFamilies.forEach((family) => presentColorFamilies.add(family));
      colorway.variants.forEach((variant) => sizes.add(variant.size));
    }
    const defaultColorway = getDefaultColorway(product);
    if (defaultColorway) defaultPrices.push(effectivePrice(defaultColorway));
  }

  const sortedSizes = [...sizes].sort((left, right) => (
    left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' })
  ));

  return {
    brands: brands.map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      logoUrl: brand.logoUrl,
      productCount: brandCounts.get(brand.id) ?? 0,
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      productCount: categoryCounts.get(category.id) ?? 0,
    })),
    colors: CATALOG_COLOR_FAMILIES.filter((color) => presentColorFamilies.has(color.slug)),
    sizes: sortedSizes,
    priceRange: {
      min: defaultPrices.length === 0 ? null : Math.min(...defaultPrices),
      max: defaultPrices.length === 0 ? null : Math.max(...defaultPrices),
    },
    sorts: [...CATALOG_SORTS],
  };
}

export async function listCatalogProducts(rawQuery = {}) {
  const filters = parseCatalogQuery(rawQuery);
  const products = await findPublicProducts();
  const matched = [];

  for (const product of products) {
    const displayColorway = productMatchesFilters(product, filters);
    if (displayColorway) matched.push({ product, displayColorway });
  }

  matched.sort((left, right) => compareProducts(left, right, filters.sort));
  const totalItems = matched.length;
  const start = (filters.page - 1) * filters.limit;
  const pageEntries = matched.slice(start, start + filters.limit);
  const pageProducts = pageEntries.map((entry) => entry.product);
  const reviewSummaries = await loadReviewSummaries(pageProducts);

  return {
    products: pageEntries.map((entry) => serializeProductCard(entry, reviewSummaries)),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / filters.limit),
    },
  };
}

export async function getCatalogBestSellers() {
  const rankedSales = await listCompletedProductSales();
  if (rankedSales.length === 0) return { products: [] };

  const products = await prisma.product.findMany({
    where: {
      ...publicProductWhere,
      id: { in: rankedSales.map((entry) => entry.productId) },
    },
    select: publicProductSelect,
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const publicRanking = rankedSales
    .map((entry) => ({ ...entry, product: productById.get(entry.productId) }))
    .filter((entry) => entry.product)
    .slice(0, 5);
  const reviewSummaries = await loadReviewSummaries(
    publicRanking.map((entry) => entry.product)
  );

  return {
    products: publicRanking.map((entry, index) => {
      const defaultColorway = getDefaultColorway(entry.product);
      return {
        ...serializeProductCard(
          { product: entry.product, displayColorway: defaultColorway },
          reviewSummaries
        ),
        quantitySold: entry.quantitySold,
        rank: index + 1,
      };
    }),
  };
}

function normalizeProductSlug(slug) {
  if (typeof slug !== 'string') throw productNotFoundError();
  const normalized = slug.trim().toLowerCase();
  if (
    !normalized
    || normalized.length > PRODUCT_SLUG_MAX_LENGTH
    || !PRODUCT_SLUG_PATTERN.test(normalized)
  ) {
    throw productNotFoundError();
  }
  return normalized;
}

export async function getCatalogProduct(slug) {
  const normalizedSlug = normalizeProductSlug(slug);
  const product = await prisma.product.findFirst({
    where: { ...publicProductWhere, slug: normalizedSlug },
    select: publicProductSelect,
  });
  if (!product) throw productNotFoundError();

  const defaultColorway = getDefaultColorway(product);
  if (!defaultColorway) throw productNotFoundError();
  const reviewSummaries = await loadReviewSummaries([product]);

  return {
    product: {
      slug: product.slug,
      name: product.name,
      description: product.description,
      brand: { slug: product.brand.slug, name: product.brand.name },
      categories: serializeCategories(product),
      createdAt: product.createdAt,
      defaultColorwaySlug: defaultColorway.slug,
      reviewSummary: reviewSummaries.get(product.id) ?? emptyReviewSummary(),
      colorways: product.colorways.map(serializeDetailColorway),
    },
  };
}
