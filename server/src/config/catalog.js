export const CATALOG_DEFAULT_PAGE = 1;
export const CATALOG_DEFAULT_LIMIT = 12;
export const CATALOG_MAX_LIMIT = 50;

export const CATALOG_SORTS = Object.freeze([
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
]);

export const CATALOG_COLOR_FAMILIES = Object.freeze([
  { slug: 'black', name: 'Đen' },
  { slug: 'white', name: 'Trắng / Kem' },
  { slug: 'grey', name: 'Xám / Bạc' },
  { slug: 'blue', name: 'Xanh dương / Navy' },
  { slug: 'green', name: 'Xanh lá / Rêu' },
  { slug: 'red', name: 'Đỏ' },
  { slug: 'pink-purple', name: 'Hồng / Tím' },
  { slug: 'orange-yellow', name: 'Cam / Vàng' },
  { slug: 'brown-beige', name: 'Nâu / Be' },
]);

// The current catalog has no persisted color-family field. This mapping is
// intentionally limited to the verified Colorway slugs in the approved seed.
// Unknown or future Admin-created Colorways must not be guessed here.
export const COLORWAY_FAMILIES_BY_SLUG = Object.freeze({
  beige: ['brown-beige', 'white'],
  black: ['black'],
  'black-grey': ['black', 'grey'],
  'black-white': ['black', 'white'],
  blue: ['blue'],
  brown: ['brown-beige'],
  'brown-cream': ['brown-beige', 'white'],
  'cream-black': ['white', 'black'],
  'dark-olive': ['green'],
  'dark-olivine': ['green'],
  egret: ['white'],
  green: ['green'],
  'green-tan': ['green', 'brown-beige'],
  grey: ['grey'],
  'grey-pink': ['grey', 'pink-purple'],
  'grey-white': ['grey', 'white'],
  'ivory-black': ['white', 'black'],
  navy: ['blue'],
  'obsidian-blue': ['blue'],
  orange: ['orange-yellow'],
  pink: ['pink-purple'],
  red: ['red'],
  sail: ['white'],
  silver: ['grey'],
  taupe: ['brown-beige', 'grey'],
  violet: ['pink-purple'],
  white: ['white'],
  'white-black': ['white', 'black'],
  'white-blue': ['white', 'blue'],
  'white-green': ['white', 'green'],
  'white-grey': ['white', 'grey'],
  'white-multicolor': ['white'],
  'white-red': ['white', 'red'],
  'white-silver': ['white', 'grey'],
  yellow: ['orange-yellow'],
});
