import {
  products,
  SIZES,
  COLOR_FAMILIES,
  COLORWAY_FAMILY_MAP,
} from '../data/catalog.js';

/**
 * 6 Approved Sort Modes for STEP/LAB Product Listing
 */
export const ALLOWED_SORTS = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
];

/**
 * Category metadata definitions for STEP/LAB storefront.
 */
const CATEGORY_DEFINITIONS = [
  {
    slug: 'lifestyle',
    name: 'Lifestyle',
    tagline: 'ÊM ÁI THƯỜNG NHẬT',
    description: 'Thiết kế cân bằng giữa sự thoải mái và phong cách sống hiện đại.',
    thumbnail: 'products/new-balance/327/beige/1.avif',
    repProduct: 'New Balance 327',
  },
  {
    slug: 'running',
    name: 'Running',
    tagline: 'HIỆU NĂNG VẬN ĐỘNG',
    description: 'Tối ưu chuyển động cùng công nghệ đệm trợ lực thể thao.',
    thumbnail: 'products/nike/pegasus-41/white-green/1.avif',
    repProduct: 'Nike Pegasus 41',
  },
  {
    slug: 'streetwear',
    name: 'Streetwear',
    tagline: 'CÁ TÍNH ĐƯỜNG PHỐ',
    description: 'Bản sắc thời trang thành thị và văn hóa sneakerhead nguyên bản.',
    thumbnail: 'products/nike/dunk-low-retro/white-black/1.avif',
    repProduct: 'Nike Dunk Low Retro',
  },
  {
    slug: 'classic',
    name: 'Classic',
    tagline: 'DI SẢN BẤT HỦ',
    description: 'Những biểu tượng thiết kế vượt thời gian của làng giày thế giới.',
    thumbnail: 'products/adidas/samba-og/white-black/1.avif',
    repProduct: 'Adidas Samba OG',
  },
];

/**
 * Normalize text by trimming, lowercasing, and removing Vietnamese diacritics
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
 * Helper to parse comma-separated or array param values
 */
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Get featured products for homepage showcase (6 flagship products)
 */
export const getFeaturedProducts = () => {
  return products.filter((product) => product.isFeatured);
};

/**
 * Get new arrivals sorted by deterministic createdAt DESC (8 products)
 */
export const getNewArrivals = (limit = 8) => {
  return [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

/**
 * Get categories with dynamic model counts
 */
export const getCategories = () => {
  const counts = {};
  products.forEach((product) => {
    product.categories.forEach((catSlug) => {
      counts[catSlug] = (counts[catSlug] || 0) + 1;
    });
  });

  return CATEGORY_DEFINITIONS.map((cat) => ({
    ...cat,
    modelCount: counts[cat.slug] || 0,
  }));
};

/**
 * Get options metadata for filters (Brands, Categories, Colors, Sizes, Price bounds)
 */
export const getFilterOptions = () => {
  // Brand list derived from products
  const brandMap = new Map();
  products.forEach((p) => {
    if (!brandMap.has(p.brand.slug)) {
      brandMap.set(p.brand.slug, { slug: p.brand.slug, name: p.brand.name, count: 0 });
    }
    brandMap.get(p.brand.slug).count += 1;
  });

  // Category counts
  const categoryMap = new Map();
  CATEGORY_DEFINITIONS.forEach((c) => {
    categoryMap.set(c.slug, { slug: c.slug, name: c.name, count: 0 });
  });
  products.forEach((p) => {
    p.categories.forEach((cSlug) => {
      if (categoryMap.has(cSlug)) {
        categoryMap.get(cSlug).count += 1;
      }
    });
  });

  return {
    brands: Array.from(brandMap.values()),
    categories: Array.from(categoryMap.values()),
    colors: COLOR_FAMILIES,
    sizes: SIZES,
    priceRange: {
      min: 1360000,
      max: 3800000,
    },
  };
};

/**
 * Query products with multi-faceted filtering, searching, sorting, and pagination.
 * Guarantees SAME-COLORWAY rule for Color, Size (stock > 0), and Price.
 */
export const getProducts = (params = {}) => {
  const search = normalizeText(params.q);
  const brands = toArray(params.brand);
  const categories = toArray(params.category);
  const colors = toArray(params.color);
  const sizes = toArray(params.size);

  const minPriceNum =
    params.minPrice != null && params.minPrice !== '' && !isNaN(Number(params.minPrice))
      ? Math.max(0, Number(params.minPrice))
      : null;

  const maxPriceNum =
    params.maxPrice != null && params.maxPrice !== '' && !isNaN(Number(params.maxPrice))
      ? Math.max(0, Number(params.maxPrice))
      : null;

  const sort = ALLOWED_SORTS.includes(params.sort) ? params.sort : 'newest';
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const pageSize = Math.max(1, parseInt(params.pageSize, 10) || 12);

  const hasColorFilter = colors.length > 0;
  const hasSizeFilter = sizes.length > 0;
  const hasPriceFilter = minPriceNum !== null || maxPriceNum !== null;
  const hasSpecificColorwayFilter = hasColorFilter || hasSizeFilter || hasPriceFilter;

  // Filter products
  const matchedList = [];

  for (const product of products) {
    // 1. Search text filter (tokens across product name, brand name, and colorway names)
    if (search) {
      const searchTokens = search.split(/\s+/).filter(Boolean);
      const allColorwayNames = product.colorways.map((c) => c.name).join(' ');
      const targetText = normalizeText(
        `${product.name} ${product.brand.name} ${allColorwayNames}`
      );
      const allTokensMatch = searchTokens.every((token) => targetText.includes(token));
      if (!allTokensMatch) continue;
    }

    // 2. Brand filter (OR within selected brands)
    if (brands.length > 0 && !brands.includes(product.brand.slug)) {
      continue;
    }

    // 3. Category filter (OR within selected categories)
    if (categories.length > 0) {
      const hasCat = product.categories.some((c) => categories.includes(c));
      if (!hasCat) continue;
    }

    // 4. Same-Colorway Evaluation for Color, Size (stock > 0), and Price
    const matchingColorways = [];

    for (const colorway of product.colorways) {
      // 4a. Color filter: colorway must belong to at least one selected family
      if (hasColorFilter) {
        const families = COLORWAY_FAMILY_MAP[colorway.slug] || [];
        const matchesColor = colors.some((c) => families.includes(c));
        if (!matchesColor) continue;
      }

      // 4b. Size filter: colorway must have in-stock variant (stock > 0) matching selected size
      if (hasSizeFilter) {
        const hasInStockSize = colorway.variants.some(
          (v) => sizes.includes(v.size) && v.stock > 0
        );
        if (!hasInStockSize) continue;
      }

      // 4c. Price filter: effective price of THIS colorway must be within range
      const effectivePrice = colorway.salePrice ?? colorway.price;
      if (minPriceNum !== null && effectivePrice < minPriceNum) continue;
      if (maxPriceNum !== null && effectivePrice > maxPriceNum) continue;

      // Colorway meets all criteria
      matchingColorways.push(colorway);
    }

    // If specific colorway filters are active, product only matches if at least 1 colorway qualifies
    if (hasSpecificColorwayFilter && matchingColorways.length === 0) {
      continue;
    }

    // 5. Determine displayColorway
    let displayColorway;
    if (!hasSpecificColorwayFilter) {
      displayColorway = product.defaultColorway;
    } else {
      // If defaultColorway is among matching colorways, preserve it; otherwise pick first matching
      const defaultIsMatched = matchingColorways.some(
        (cw) => cw.slug === product.defaultColorwaySlug
      );
      displayColorway = defaultIsMatched
        ? product.defaultColorway
        : matchingColorways[0];
    }

    const displayEffectivePrice = displayColorway.salePrice ?? displayColorway.price;

    matchedList.push({
      ...product,
      displayColorway,
      displayEffectivePrice,
    });
  }

  // Sorter
  matchedList.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.displayEffectivePrice - b.displayEffectivePrice;
      case 'price-desc':
        return b.displayEffectivePrice - a.displayEffectivePrice;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'vi');
      case 'name-desc':
        return b.name.localeCompare(a.name, 'vi');
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'newest':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  // Pagination
  const total = matchedList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const items = matchedList.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    totalPages,
    currentPage,
    pageSize,
  };
};

/**
 * Get product by slug for Product Detail page.
 * Returns product object or null if not found.
 */
export const getProductBySlug = (slug) => {
  if (!slug) return null;
  return products.find((p) => p.slug === slug) || null;
};

/**
 * Get colorway by slug from a product with validation status.
 * If colorwaySlug is valid, returns { colorway, isValid: true }.
 * If colorwaySlug is omitted/empty, returns { colorway: defaultColorway, isValid: true }.
 * If colorwaySlug is provided but not found, returns { colorway: defaultColorway, isValid: false }.
 */
export const getColorwayBySlug = (product, colorwaySlug) => {
  if (!product) return { colorway: null, isValid: false };
  if (!colorwaySlug) {
    return { colorway: product.defaultColorway, isValid: true };
  }
  const match = product.colorways.find((cw) => cw.slug === colorwaySlug);
  if (match) {
    return { colorway: match, isValid: true };
  }
  return { colorway: product.defaultColorway, isValid: false };
};
