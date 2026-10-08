/**
 * STEP/LAB Product Catalog — Single Source of Truth
 * 20 Products, 80 Verified Colorways, 720 Deterministic Variants (EU 36-44)
 */

export const SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];

/**
 * 9 Standard Color Families for Storefront UI Filter
 * Swatch hex colors are presentation tokens only.
 */
export const COLOR_FAMILIES = [
  { id: 'black', name: 'Đen', hex: '#121212', border: '#262626' },
  { id: 'white', name: 'Trắng / Kem', hex: '#f8f8f6', border: '#d1d1cc' },
  { id: 'grey', name: 'Xám / Bạc', hex: '#9ca3af', border: '#6b7280' },
  { id: 'blue', name: 'Xanh dương / Navy', hex: '#2563eb', border: '#1d4ed8' },
  { id: 'green', name: 'Xanh lá / Rêu', hex: '#16a34a', border: '#15803d' },
  { id: 'red', name: 'Đỏ', hex: '#dc2626', border: '#b91c1c' },
  { id: 'pink-purple', name: 'Hồng / Tím', hex: '#ec4899', border: '#db2777' },
  { id: 'orange-yellow', name: 'Cam / Vàng', hex: '#f59e0b', border: '#d97706' },
  { id: 'brown-beige', name: 'Nâu / Be', hex: '#92400e', border: '#78350f' },
];

/**
 * 100% Complete Mapping of all 35 verified Colorway slugs to Color Families
 * A colorway can belong to multiple families (e.g. white-black belongs to white and black).
 */
export const COLORWAY_FAMILY_MAP = {
  'beige': ['brown-beige', 'white'],
  'black': ['black'],
  'black-grey': ['black', 'grey'],
  'black-white': ['black', 'white'],
  'blue': ['blue'],
  'brown': ['brown-beige'],
  'brown-cream': ['brown-beige', 'white'],
  'cream-black': ['white', 'black'],
  'dark-olive': ['green'],
  'dark-olivine': ['green'],
  'egret': ['white'],
  'green': ['green'],
  'green-tan': ['green', 'brown-beige'],
  'grey': ['grey'],
  'grey-pink': ['grey', 'pink-purple'],
  'grey-white': ['grey', 'white'],
  'ivory-black': ['white', 'black'],
  'navy': ['blue'],
  'obsidian-blue': ['blue'],
  'orange': ['orange-yellow'],
  'pink': ['pink-purple'],
  'red': ['red'],
  'sail': ['white'],
  'silver': ['grey'],
  'taupe': ['brown-beige', 'grey'],
  'violet': ['pink-purple'],
  'white': ['white'],
  'white-black': ['white', 'black'],
  'white-blue': ['white', 'blue'],
  'white-green': ['white', 'green'],
  'white-grey': ['white', 'grey'],
  'white-multicolor': ['white'],
  'white-red': ['white', 'red'],
  'white-silver': ['white', 'grey'],
  'yellow': ['orange-yellow'],
};

/**
 * Display names for Colorway Slugs
 */
export const COLORWAY_DISPLAY_NAMES = {
  'beige': 'Beige',
  'black': 'Black',
  'black-grey': 'Black / Grey',
  'black-white': 'Black / White',
  'blue': 'Blue',
  'brown': 'Brown',
  'brown-cream': 'Brown / Cream',
  'cream-black': 'Cream / Black',
  'dark-olive': 'Dark Olive',
  'dark-olivine': 'Dark Olivine',
  'egret': 'Egret',
  'green': 'Green',
  'green-tan': 'Green / Tan',
  'grey': 'Grey',
  'grey-pink': 'Grey / Pink',
  'grey-white': 'Grey / White',
  'ivory-black': 'Ivory / Black',
  'navy': 'Navy',
  'obsidian-blue': 'Obsidian Blue',
  'orange': 'Orange',
  'pink': 'Bliss Pink',
  'red': 'Red',
  'sail': 'Sail',
  'silver': 'Silver',
  'taupe': 'Taupe',
  'violet': 'Violet',
  'white': 'White',
  'white-black': 'White / Black',
  'white-blue': 'White / Blue',
  'white-green': 'White / Green',
  'white-grey': 'White / Grey',
  'white-multicolor': 'White / Multicolor',
  'white-red': 'White / Red',
  'white-silver': 'White / Silver',
  'yellow': 'Yellow',
};

export const categoryMapping = {
  'campus-00s': ['streetwear', 'lifestyle'],
  'gazelle-indoor': ['classic', 'lifestyle'],
  'samba-og': ['classic', 'streetwear'],
  'superstar-ii': ['classic', 'streetwear'],
  'chuck-70-canvas': ['classic', 'streetwear'],
  'chuck-taylor-all-star-canvas': ['classic', 'lifestyle'],
  'run-star-hike': ['streetwear', 'lifestyle'],
  'run-star-trainer': ['lifestyle', 'classic'],
  '2002r': ['lifestyle', 'running'],
  '327': ['lifestyle', 'classic'],
  '530': ['running', 'lifestyle'],
  '574': ['classic', 'lifestyle'],
  'air-force-1-07': ['classic', 'streetwear'],
  'air-max-90': ['classic', 'running', 'lifestyle'],
  'dunk-low-retro': ['streetwear', 'lifestyle'],
  'pegasus-41': ['running'],
  'palermo': ['classic', 'lifestyle'],
  'rs-x-efekt-prm': ['streetwear', 'running'],
  'speedcat-og': ['streetwear', 'classic'],
  'suede-xl': ['streetwear', 'classic'],
};

/**
 * Deterministic hash formula for generating variant stock.
 * Guaranteed 100% reproducible without random drift.
 */
function getDeterministicStock(productSlug, colorwaySlug, size) {
  let hash = 0;
  const key = `${productSlug}:${colorwaySlug}:${size}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const mod = abs % 100;
  // Distribution: ~12% out of stock (0), ~16% low stock (1-3), ~72% in stock (4-18)
  if (mod < 12) return 0;
  if (mod < 28) return (abs % 3) + 1;
  return (abs % 15) + 4;
}

/**
 * Raw product definitions with 4 colorways per product from resources/products
 */
const rawProducts = [
  {
    slug: 'pegasus-41',
    name: 'Pegasus 41',
    brand: { slug: 'nike', name: 'Nike' },
    defaultColorwaySlug: 'white-green',
    colorwaySlugs: ['black', 'blue', 'white', 'white-green'],
    price: 3800000,
    salePrice: null,
    categories: ['running'],
    isFeatured: false,
    createdAt: '2026-10-08T00:00:00.000Z',
  },
  {
    slug: 'speedcat-og',
    name: 'Speedcat OG',
    brand: { slug: 'puma', name: 'Puma' },
    defaultColorwaySlug: 'red',
    colorwaySlugs: ['black', 'blue', 'grey', 'red'],
    price: 2600000,
    salePrice: null,
    categories: ['streetwear', 'classic'],
    isFeatured: true,
    createdAt: '2026-10-07T00:00:00.000Z',
  },
  {
    slug: 'run-star-trainer',
    name: 'Run Star Trainer',
    brand: { slug: 'converse', name: 'Converse' },
    defaultColorwaySlug: 'egret',
    colorwaySlugs: ['black', 'brown', 'egret', 'green'],
    price: 2500000,
    salePrice: null,
    categories: ['lifestyle', 'classic'],
    isFeatured: false,
    createdAt: '2026-10-06T00:00:00.000Z',
  },
  {
    slug: 'campus-00s',
    name: 'Campus 00s',
    brand: { slug: 'adidas', name: 'Adidas' },
    defaultColorwaySlug: 'green',
    colorwaySlugs: ['blue', 'green', 'pink', 'white-black'],
    price: 2600000,
    salePrice: null,
    categories: ['streetwear', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-10-05T00:00:00.000Z',
  },
  {
    slug: '2002r',
    name: '2002R',
    brand: { slug: 'new-balance', name: 'New Balance' },
    defaultColorwaySlug: 'grey',
    colorwaySlugs: ['black', 'dark-olivine', 'grey', 'taupe'],
    price: 3800000,
    salePrice: null,
    categories: ['lifestyle', 'running'],
    isFeatured: false,
    createdAt: '2026-10-04T00:00:00.000Z',
  },
  {
    slug: 'palermo',
    name: 'Palermo',
    brand: { slug: 'puma', name: 'Puma' },
    defaultColorwaySlug: 'green',
    colorwaySlugs: ['black', 'green', 'red', 'white'],
    price: 2400000,
    salePrice: null,
    categories: ['classic', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-10-03T00:00:00.000Z',
  },
  {
    slug: 'dunk-low-retro',
    name: 'Dunk Low Retro',
    brand: { slug: 'nike', name: 'Nike' },
    defaultColorwaySlug: 'white-black',
    colorwaySlugs: ['brown-cream', 'green-tan', 'white-black', 'white-grey'],
    price: 2900000,
    salePrice: null,
    categories: ['streetwear', 'lifestyle'],
    isFeatured: true,
    createdAt: '2026-10-02T00:00:00.000Z',
  },
  {
    slug: '530',
    name: '530',
    brand: { slug: 'new-balance', name: 'New Balance' },
    defaultColorwaySlug: 'white-silver',
    colorwaySlugs: ['beige', 'black', 'grey', 'white-silver'],
    price: 2800000,
    salePrice: null,
    categories: ['running', 'lifestyle'],
    isFeatured: true,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    slug: 'gazelle-indoor',
    name: 'Gazelle Indoor',
    brand: { slug: 'adidas', name: 'Adidas' },
    defaultColorwaySlug: 'pink',
    colorwaySlugs: ['black', 'green', 'orange', 'pink'],
    price: 2900000,
    salePrice: null,
    categories: ['classic', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-09-30T00:00:00.000Z',
  },
  {
    slug: 'suede-xl',
    name: 'Suede XL',
    brand: { slug: 'puma', name: 'Puma' },
    defaultColorwaySlug: 'black',
    colorwaySlugs: ['black', 'blue', 'green', 'red'],
    price: 2500000,
    salePrice: 2125000,
    categories: ['streetwear', 'classic'],
    isFeatured: false,
    createdAt: '2026-09-29T00:00:00.000Z',
  },
  {
    slug: 'air-max-90',
    name: 'Air Max 90',
    brand: { slug: 'nike', name: 'Nike' },
    defaultColorwaySlug: 'white-red',
    colorwaySlugs: ['black', 'grey-pink', 'white-grey', 'white-red'],
    price: 3500000,
    salePrice: 2975000,
    categories: ['classic', 'running', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-09-28T00:00:00.000Z',
  },
  {
    slug: '327',
    name: '327',
    brand: { slug: 'new-balance', name: 'New Balance' },
    defaultColorwaySlug: 'beige',
    colorwaySlugs: ['beige', 'black', 'white', 'yellow'],
    price: 2700000,
    salePrice: null,
    categories: ['lifestyle', 'classic'],
    isFeatured: false,
    createdAt: '2026-09-27T00:00:00.000Z',
  },
  {
    slug: 'samba-og',
    name: 'Samba OG',
    brand: { slug: 'adidas', name: 'Adidas' },
    defaultColorwaySlug: 'white-black',
    colorwaySlugs: ['black-white', 'cream-black', 'silver', 'white-black'],
    price: 2800000,
    salePrice: null,
    categories: ['classic', 'streetwear'],
    isFeatured: true,
    createdAt: '2026-09-26T00:00:00.000Z',
  },
  {
    slug: 'air-force-1-07',
    name: "Air Force 1 '07",
    brand: { slug: 'nike', name: 'Nike' },
    defaultColorwaySlug: 'white',
    colorwaySlugs: ['black', 'sail', 'white', 'white-blue'],
    price: 2900000,
    salePrice: null,
    categories: ['classic', 'streetwear'],
    isFeatured: true,
    createdAt: '2026-09-25T00:00:00.000Z',
  },
  {
    slug: 'superstar-ii',
    name: 'Superstar II',
    brand: { slug: 'adidas', name: 'Adidas' },
    defaultColorwaySlug: 'black-white',
    colorwaySlugs: ['beige', 'black-white', 'brown', 'white-multicolor'],
    price: 2600000,
    salePrice: 2210000,
    categories: ['classic', 'streetwear'],
    isFeatured: false,
    createdAt: '2026-09-24T00:00:00.000Z',
  },
  {
    slug: '574',
    name: '574',
    brand: { slug: 'new-balance', name: 'New Balance' },
    defaultColorwaySlug: 'grey',
    colorwaySlugs: ['beige', 'black', 'grey', 'navy'],
    price: 2400000,
    salePrice: 2040000,
    categories: ['classic', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-09-23T00:00:00.000Z',
  },
  {
    slug: 'chuck-70-canvas',
    name: 'Chuck 70 Canvas',
    brand: { slug: 'converse', name: 'Converse' },
    defaultColorwaySlug: 'black',
    colorwaySlugs: ['black', 'obsidian-blue', 'red', 'white'],
    price: 2200000,
    salePrice: null,
    categories: ['classic', 'streetwear'],
    isFeatured: true,
    createdAt: '2026-09-22T00:00:00.000Z',
  },
  {
    slug: 'rs-x-efekt-prm',
    name: 'RS-X Efekt PRM',
    brand: { slug: 'puma', name: 'Puma' },
    defaultColorwaySlug: 'grey-white',
    colorwaySlugs: ['black-grey', 'dark-olive', 'grey-white', 'ivory-black'],
    price: 3200000,
    salePrice: null,
    categories: ['streetwear', 'running'],
    isFeatured: false,
    createdAt: '2026-09-21T00:00:00.000Z',
  },
  {
    slug: 'run-star-hike',
    name: 'Run Star Hike',
    brand: { slug: 'converse', name: 'Converse' },
    defaultColorwaySlug: 'black',
    colorwaySlugs: ['black', 'grey', 'violet', 'white'],
    price: 2800000,
    salePrice: null,
    categories: ['streetwear', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-09-20T00:00:00.000Z',
  },
  {
    slug: 'chuck-taylor-all-star-canvas',
    name: 'Chuck Taylor All Star Canvas',
    brand: { slug: 'converse', name: 'Converse' },
    defaultColorwaySlug: 'black',
    colorwaySlugs: ['black', 'blue', 'red', 'white'],
    price: 1600000,
    salePrice: 1360000,
    categories: ['classic', 'lifestyle'],
    isFeatured: false,
    createdAt: '2026-09-19T00:00:00.000Z',
  },
];

/**
 * Normalized 20 Products with 80 Colorways & 720 Variants.
 * defaultColorway is a derived getter from colorways array (Single Source of Truth).
 */
export const products = rawProducts.map((p) => {
  const colorways = p.colorwaySlugs.map((cwSlug) => {
    const isDefault = cwSlug === p.defaultColorwaySlug;
    const thumbnail = `products/${p.brand.slug}/${p.slug}/${cwSlug}/1.avif`;
    const variants = SIZES.map((size) => ({
      size,
      stock: getDeterministicStock(p.slug, cwSlug, size),
    }));

    // Ensure every colorway has at least one variant with stock > 0
    const hasAvailable = variants.some((v) => v.stock > 0);
    if (!hasAvailable) {
      variants[0].stock = 5;
    }

    return {
      slug: cwSlug,
      name: COLORWAY_DISPLAY_NAMES[cwSlug] || cwSlug,
      price: p.price,
      salePrice: p.salePrice,
      isDefault,
      thumbnail,
      variants,
    };
  });

  const defaultColorway =
    colorways.find((cw) => cw.slug === p.defaultColorwaySlug) || colorways[0];

  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    defaultColorwaySlug: p.defaultColorwaySlug,
    categories: p.categories,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt,
    colorways,
    get defaultColorway() {
      return defaultColorway;
    },
  };
});
