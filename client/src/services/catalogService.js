/**
 * STEP/LAB Storefront Catalog Service
 * Single source of truth for public catalog data, communicating with
 * backend endpoints (/api/catalog/options, /api/catalog/products, /api/catalog/products/:slug).
 */

export const SIZES = Object.freeze(['36', '37', '38', '39', '40', '41', '42', '43', '44']);

/**
 * 6 Approved Sort Modes for STEP/LAB Product Listing
 */
export const ALLOWED_SORTS = Object.freeze([
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
]);

/**
 * Presentation swatch styling for the 9 standard color families.
 * Backend only stores slug and name; visual tokens remain frontend-owned.
 */
export const COLOR_SWATCH_MAP = Object.freeze({
  black: { hex: '#121212', border: '#262626' },
  white: { hex: '#f8f8f6', border: '#d1d1cc' },
  grey: { hex: '#9ca3af', border: '#6b7280' },
  blue: { hex: '#2563eb', border: '#1d4ed8' },
  green: { hex: '#16a34a', border: '#15803d' },
  red: { hex: '#dc2626', border: '#b91c1c' },
  'pink-purple': { hex: '#ec4899', border: '#db2777' },
  'orange-yellow': { hex: '#f59e0b', border: '#d97706' },
  'brown-beige': { hex: '#92400e', border: '#78350f' },
});

/**
 * Normalizes text by lowercasing and removing Vietnamese diacritics.
 */
export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

/**
 * Normalizes HTTP error responses into structured Error objects.
 */
function createCatalogApiError(response, data) {
  const error = new Error(
    data?.error?.message || response.statusText || 'Không thể tải dữ liệu sản phẩm.'
  );
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  return error;
}

/**
 * Base fetcher for public Catalog API.
 */
async function catalogRequest(path) {
  let response;
  try {
    response = await fetch(`/api/catalog${path}`, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
    error.code = 'NETWORK_ERROR';
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw createCatalogApiError(response, data);
  }

  return data?.data;
}

/**
 * In-flight promise cache to deduplicate concurrent requests for identical slugs.
 */
const inFlightProductRequests = new Map();

/**
 * Normalizes a raw Product object from GET /api/catalog/products/:slug.
 * Ensures defaultColorway is readily accessible and category names are safely extractable.
 */
export function normalizeCatalogProduct(product) {
  if (!product || typeof product !== 'object') return null;

  const colorways = Array.isArray(product.colorways) ? product.colorways : [];
  const defaultColorway =
    colorways.find((cw) => cw.isDefault || cw.slug === product.defaultColorwaySlug) ||
    colorways[0] ||
    null;

  const categoryList = Array.isArray(product.categories) ? product.categories : [];
  const categoryNames = categoryList.map((cat) =>
    typeof cat === 'string' ? cat : cat?.name || cat?.slug || ''
  ).filter(Boolean);

  return {
    ...product,
    defaultColorway,
    categoryNames,
  };
}

/**
 * Fetches public catalog options (active brands, categories, colors, sizes, price range, sorts).
 * Adapts backend response for existing UI components:
 * - maps `productCount` to `count` for brands and categories
 * - enriches colors with `id = slug` and visual swatch tokens (hex, border)
 */
export async function fetchCatalogOptions() {
  const raw = await catalogRequest('/options');

  const brands = (raw?.brands || []).map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    logoUrl: brand.logoUrl,
    productCount: brand.productCount ?? 0,
    count: brand.productCount ?? 0,
  }));

  const categories = (raw?.categories || []).map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    productCount: cat.productCount ?? 0,
    count: cat.productCount ?? 0,
  }));

  const colors = (raw?.colors || []).map((col) => {
    const swatch = COLOR_SWATCH_MAP[col.slug] || { hex: '#d4d4ce', border: '#a3a3a3' };
    return {
      slug: col.slug,
      name: col.name,
      id: col.slug,
      hex: swatch.hex,
      border: swatch.border,
    };
  });

  return {
    brands,
    categories,
    colors,
    sizes: Array.isArray(raw?.sizes) ? raw.sizes : [...SIZES],
    priceRange: raw?.priceRange || { min: null, max: null },
    sorts: Array.isArray(raw?.sorts) ? raw.sorts : [...ALLOWED_SORTS],
  };
}

/**
 * Fetches public products list with multi-faceted filtering, sorting and pagination.
 *
 * @param {Object} params
 * @param {string} [params.q]
 * @param {string|string[]} [params.brand]
 * @param {string|string[]} [params.category]
 * @param {string|string[]} [params.color]
 * @param {string|string[]} [params.size]
 * @param {number|string} [params.minPrice]
 * @param {number|string} [params.maxPrice]
 * @param {string} [params.sort]
 * @param {boolean} [params.featured]
 * @param {number|string} [params.page]
 * @param {number|string} [params.limit]
 */
export async function fetchCatalogProducts(params = {}) {
  const query = new URLSearchParams();

  if (params.q && typeof params.q === 'string' && params.q.trim()) {
    query.set('q', params.q.trim());
  }

  const toCsv = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.filter(Boolean).join(',');
    return String(val).trim();
  };

  const brandCsv = toCsv(params.brand);
  if (brandCsv) query.set('brand', brandCsv);

  const categoryCsv = toCsv(params.category);
  if (categoryCsv) query.set('category', categoryCsv);

  const colorCsv = toCsv(params.color);
  if (colorCsv) query.set('color', colorCsv);

  const sizeCsv = toCsv(params.size);
  if (sizeCsv) query.set('size', sizeCsv);

  if (params.minPrice !== undefined && params.minPrice !== null && params.minPrice !== '') {
    const num = Number(params.minPrice);
    if (Number.isFinite(num) && num >= 0) query.set('minPrice', String(num));
  }

  if (params.maxPrice !== undefined && params.maxPrice !== null && params.maxPrice !== '') {
    const num = Number(params.maxPrice);
    if (Number.isFinite(num) && num >= 0) query.set('maxPrice', String(num));
  }

  if (params.sort && ALLOWED_SORTS.includes(params.sort)) {
    query.set('sort', params.sort);
  }

  if (params.featured === true || params.featured === 'true') {
    query.set('featured', 'true');
  } else if (params.featured === false || params.featured === 'false') {
    query.set('featured', 'false');
  }

  if (params.page) {
    const p = Number(params.page);
    if (Number.isSafeInteger(p) && p >= 1) query.set('page', String(p));
  }

  if (params.limit) {
    const l = Number(params.limit);
    if (Number.isSafeInteger(l) && l >= 1) query.set('limit', String(l));
  }

  const queryString = query.toString();
  const endpoint = queryString ? `/products?${queryString}` : '/products';
  const data = await catalogRequest(endpoint);

  return {
    products: Array.isArray(data?.products) ? data.products : [],
    pagination: data?.pagination || {
      page: 1,
      limit: 12,
      totalItems: 0,
      totalPages: 1,
    },
  };
}

/**
 * Fetches a single public Product by slug.
 * Deduplicates concurrent in-flight requests for the exact same slug.
 *
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Normalized product detail object
 */
export async function fetchCatalogProduct(slug) {
  if (!slug || typeof slug !== 'string') {
    const error = new Error('Slug sản phẩm không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_SLUG';
    throw error;
  }

  const cleanSlug = slug.trim().toLowerCase();

  // Deduplicate in-flight requests
  if (inFlightProductRequests.has(cleanSlug)) {
    return inFlightProductRequests.get(cleanSlug);
  }

  const fetchPromise = (async () => {
    try {
      const data = await catalogRequest(`/products/${encodeURIComponent(cleanSlug)}`);
      return normalizeCatalogProduct(data?.product);
    } finally {
      inFlightProductRequests.delete(cleanSlug);
    }
  })();

  inFlightProductRequests.set(cleanSlug, fetchPromise);
  return fetchPromise;
}

/**
 * Resolves the colorway by slug from a product with validation status.
 * Pure synchronous helper working against the normalized product object.
 */
export function getColorwayBySlug(product, colorwaySlug) {
  if (!product || !Array.isArray(product.colorways)) {
    return { colorway: null, isValid: false };
  }

  const defaultColorway =
    product.defaultColorway ||
    product.colorways.find((cw) => cw.isDefault || cw.slug === product.defaultColorwaySlug) ||
    product.colorways[0] ||
    null;

  if (!colorwaySlug) {
    return { colorway: defaultColorway, isValid: true };
  }

  const match = product.colorways.find((cw) => cw.slug === colorwaySlug);
  if (match) {
    return { colorway: match, isValid: true };
  }

  return { colorway: defaultColorway, isValid: false };
}

/**
 * Fetches New Arrivals (latest 8 eligible products based on createdAt DESC).
 */
export function fetchNewArrivals(limit = 8) {
  return fetchCatalogProducts({ sort: 'newest', limit });
}

/**
 * Fetches Featured Products (up to 6 eligible featured products).
 */
export function fetchFeaturedProducts(limit = 6) {
  return fetchCatalogProducts({ featured: true, limit });
}

/**
 * Fetches Best Sellers (up to 5 ranked completed-sales products).
 */
export async function fetchBestSellers() {
  const data = await catalogRequest('/best-sellers');
  return Array.isArray(data?.products) ? data.products : [];
}

/**
 * In-memory thumbnail cache for Member Reviews page.
 * Keeps successful thumbnail lookups and 404/inactive outcomes in memory.
 * Transient network failures are NOT cached so they can be retried.
 */
const reviewThumbnailCache = new Map();

/**
 * Resolves a product thumbnail for a review asynchronously.
 * Returns the thumbnail string path, or null if inactive/not found/failed.
 */
export async function resolveReviewProductThumbnail(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim().toLowerCase();

  if (reviewThumbnailCache.has(cleanSlug)) {
    return reviewThumbnailCache.get(cleanSlug);
  }

  try {
    const product = await fetchCatalogProduct(cleanSlug);
    const thumbnail =
      product?.defaultColorway?.thumbnail ||
      product?.colorways?.[0]?.thumbnail ||
      null;

    reviewThumbnailCache.set(cleanSlug, thumbnail);
    return thumbnail;
  } catch (error) {
    // If 404, product is inactive or deleted: cache null so we don't spam 404s
    if (error?.status === 404 || error?.code === 'PRODUCT_NOT_FOUND') {
      reviewThumbnailCache.set(cleanSlug, null);
    }
    // Transient network errors are not cached permanently
    return null;
  }
}
