/**
 * STEP/LAB Storefront Configuration
 * Source of truth for identity, navigation, hero banners, and brand items.
 */

export const getAssetUrl = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
};

export const siteConfig = {
  name: 'STEP/LAB',
  tagline: 'Multi-Brand Footwear',
  announcement: 'STEP/LAB • MULTI-BRAND FOOTWEAR • EU 36–44 • COD',
  copyright: '© 2026 STEP/LAB. All rights reserved.',

  // Active navigation for Storefront Catalog
  navLinks: [
    { label: 'Trang chủ', href: '/' },
    { label: 'Sản phẩm', href: '/products' },
    { label: 'Thương hiệu', href: '/#brands' },
    { label: 'Danh mục', href: '/#categories' },
    { label: 'Mới về', href: '/#new-arrivals' },
    { label: 'Nổi bật', href: '/#featured' },
  ],

  // 4 curated hero slides
  heroSlides: [
    {
      id: 'hero-01',
      image: 'banners/hero_01_products.avif',
      alt: 'Bộ sưu tập giày thể thao và streetwear đa thương hiệu tại STEP/LAB',
      tag: 'CURATED SELECTION',
      title: 'Đa dạng thương hiệu & phong cách',
      subtitle: 'Tuyển chọn những thiết kế kinh điển từ các thương hiệu giày hàng đầu thế giới.',
      ctaText: 'Khám phá thương hiệu',
      ctaHref: '#brands',
      objectPosition: 'center center',
    },
    {
      id: 'hero-02',
      image: 'banners/hero_02_streetwear.avif',
      alt: 'Phong cách thời trang streetwear cùng sneaker cá tính',
      tag: 'STREET CULTURE',
      title: 'Đậm chất Streetwear',
      subtitle: 'Phối màu kinh điển và form dáng biểu tượng cho phong cách thời trang thường nhật.',
      ctaText: 'Khám phá thương hiệu',
      ctaHref: '#brands',
      objectPosition: 'center 40%',
    },
    {
      id: 'hero-03',
      image: 'banners/hero_03_running.avif',
      alt: 'Dòng giày thể thao vận động và chạy bộ êm ái',
      tag: 'PERFORMANCE & COMFORT',
      title: 'Vận động & Hiệu năng',
      subtitle: 'Công nghệ đệm êm ái, tối ưu chuyển động và độ bền bỉ qua từng bước đi.',
      ctaText: 'Khám phá thương hiệu',
      ctaHref: '#brands',
      objectPosition: 'center center',
    },
    {
      id: 'hero-04',
      image: 'banners/hero_04_collection.avif',
      alt: 'Bộ sưu tập sneaker di sản vượt thời gian',
      tag: 'TIMELESS ICONS',
      title: 'Thiết kế vượt thời gian',
      subtitle: 'Những dòng giày di sản đồng hành cùng nhiều thế hệ tín đồ sneaker.',
      ctaText: 'Khám phá thương hiệu',
      ctaHref: '#brands',
      objectPosition: 'center 45%',
    },
  ],

  // 5 verified brands
  brands: [
    {
      id: 'nike',
      name: 'Nike',
      logo: 'logos/nike.svg',
      futureHref: '/products?brand=nike',
    },
    {
      id: 'adidas',
      name: 'Adidas',
      logo: 'logos/adidas.svg',
      futureHref: '/products?brand=adidas',
    },
    {
      id: 'new-balance',
      name: 'New Balance',
      logo: 'logos/new-balance.svg',
      futureHref: '/products?brand=new-balance',
    },
    {
      id: 'puma',
      name: 'Puma',
      logo: 'logos/puma.svg',
      futureHref: '/products?brand=puma',
    },
    {
      id: 'converse',
      name: 'Converse',
      logo: 'logos/converse.svg',
      futureHref: '/products?brand=converse',
    },
  ],
};
