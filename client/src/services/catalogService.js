import { products } from '../data/catalog';

/**
 * Category metadata definitions for STEP/LAB storefront.
 * Thumbnails use selected representative products from the 20-image catalog subset.
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
 * Get featured products for homepage showcase.
 * Exactly 6 products representing 5 brands.
 */
export const getFeaturedProducts = () => {
  return products.filter((product) => product.isFeatured);
};

/**
 * Get new arrivals sorted by deterministic createdAt DESC.
 * Defaults to 8 items for the homepage 4x2 grid.
 */
export const getNewArrivals = (limit = 8) => {
  return [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

/**
 * Get categories with model counts derived dynamically from the catalog.
 * Guaranteed to match exact derived counts (Classic: 13, Lifestyle: 12, Streetwear: 10, Running: 5).
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
