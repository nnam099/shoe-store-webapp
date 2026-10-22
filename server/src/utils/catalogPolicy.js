import { CATALOG_COLOR_FAMILIES } from '../config/catalog.js';
import { validationError } from './adminValidation.js';

export const COLORWAY_MIN_IMAGES = 3;
export const COLORWAY_MAX_IMAGES = 4;
export const MAX_CATALOG_PRICE = 999_999_999_999;
export const SUPPORTED_COLOR_FAMILIES = Object.freeze(
  CATALOG_COLOR_FAMILIES.map(({ slug }) => slug)
);

export function parseMoney(value, field, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_CATALOG_PRICE) {
    throw validationError(`${field} must be a positive integer VND amount`);
  }
  return value;
}

export function validatePrices(price, salePrice) {
  const normalizedPrice = parseMoney(price, 'price');
  const normalizedSale = parseMoney(salePrice, 'salePrice', { nullable: true });
  if (normalizedSale !== null && normalizedSale >= normalizedPrice) {
    throw validationError('salePrice must be lower than price');
  }
  return { price: normalizedPrice, salePrice: normalizedSale };
}

export function validateColorFamilies(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw validationError('colorFamilies must contain at least one supported value');
  }
  const unique = [...new Set(value)];
  if (
    unique.length !== value.length
    || unique.some((item) => typeof item !== 'string' || !SUPPORTED_COLOR_FAMILIES.includes(item))
  ) throw validationError('colorFamilies contains duplicate or unsupported values');
  return unique;
}

export function getColorwayReadinessIssues(colorway) {
  const issues = [];
  if (!colorway.isActive) issues.push({ field: 'isActive', reason: 'COLORWAY_INACTIVE' });
  if (!Array.isArray(colorway.colorFamilies) || colorway.colorFamilies.length === 0) {
    issues.push({ field: 'colorFamilies', reason: 'COLOR_FAMILIES_REQUIRED' });
  }
  const imageCount = colorway.images?.length ?? 0;
  if (imageCount < COLORWAY_MIN_IMAGES || imageCount > COLORWAY_MAX_IMAGES) {
    issues.push({ field: 'images', reason: 'IMAGE_COUNT_INVALID' });
  }
  if ((colorway.images ?? []).filter((image) => image.isThumbnail).length !== 1) {
    issues.push({ field: 'images', reason: 'THUMBNAIL_REQUIRED' });
  }
  if ((colorway.variants?.length ?? 0) < 1) {
    issues.push({ field: 'variants', reason: 'VARIANT_REQUIRED' });
  }
  return issues;
}

export function getProductReadinessIssues(product) {
  const issues = [];
  if (!product.brand?.isActive) issues.push({ field: 'brandId', reason: 'BRAND_INACTIVE' });
  if ((product.productCategories?.length ?? 0) < 1) {
    issues.push({ field: 'categoryIds', reason: 'CATEGORY_REQUIRED' });
  }
  const defaults = (product.colorways ?? []).filter((colorway) => colorway.isDefault);
  if (defaults.length !== 1) issues.push({ field: 'colorways', reason: 'DEFAULT_COLORWAY_REQUIRED' });
  const activeColorways = (product.colorways ?? []).filter((colorway) => colorway.isActive);
  if (activeColorways.length === 0) {
    issues.push({ field: 'colorways', reason: 'ACTIVE_COLORWAY_REQUIRED' });
  }
  for (const colorway of activeColorways) {
    issues.push(...getColorwayReadinessIssues(colorway).map((issue) => ({
      ...issue,
      colorwayId: colorway.id,
    })));
  }
  return issues;
}
