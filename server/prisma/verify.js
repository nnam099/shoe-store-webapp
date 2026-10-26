import prisma from '../src/config/db.js';
import { CATALOG_COLOR_FAMILIES } from '../src/config/catalog.js';

const SEED_BASELINE_FLAG = '--seed-baseline';
const EXPECTED_SEED_COUNTS = Object.freeze({
  brands: 5,
  categories: 4,
  products: 20,
  productCategories: 40,
  colorways: 80,
  productImages: 314,
  variants: 720,
});
const EXPECTED_SEED_SIZES = Object.freeze(['36', '37', '38', '39', '40', '41', '42', '43', '44']);
const EXPECTED_SEED_SALE_SLUGS = Object.freeze([
  'chuck-taylor-all-star-canvas',
  '574',
  'suede-xl',
  'superstar-ii',
  'air-max-90',
].sort());
const EXPECTED_SEED_FEATURED_SLUGS = Object.freeze([
  'samba-og',
  'air-force-1-07',
  '530',
  'speedcat-og',
  'dunk-low-retro',
  'chuck-70-canvas',
].sort());

async function loadCatalogCounts() {
  const [
    brands,
    categories,
    products,
    productCategories,
    colorways,
    productImages,
    variants,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.colorway.count(),
    prisma.productImage.count(),
    prisma.variant.count(),
  ]);

  return { brands, categories, products, productCategories, colorways, productImages, variants };
}

async function loadProducts() {
  return prisma.product.findMany({
    include: {
      brand: true,
      colorways: {
        include: {
          variants: true,
          images: true,
        },
      },
      productCategories: {
        include: { category: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function addIssue(issues, code, subject, message) {
  issues.push({ code, subject, message });
}

function verifyRuntimeCatalog(products) {
  const issues = [];
  const supportedColorFamilies = new Set(CATALOG_COLOR_FAMILIES.map(({ slug }) => slug));

  for (const product of products) {
    const subject = `Product ${product.slug}`;
    const defaults = product.colorways.filter((colorway) => colorway.isDefault);

    if (defaults.length > 1) {
      addIssue(issues, 'MULTIPLE_DEFAULT_COLORWAYS', subject, 'has more than one default Colorway');
    }
    if (defaults.some((colorway) => !colorway.isActive)) {
      addIssue(issues, 'INACTIVE_DEFAULT_COLORWAY', subject, 'has an inactive default Colorway');
    }

    if (product.isActive) {
      if (product.productCategories.length === 0) {
        addIssue(issues, 'ACTIVE_PRODUCT_WITHOUT_CATEGORY', subject, 'has no Category relation');
      }
      if (defaults.length !== 1) {
        addIssue(issues, 'ACTIVE_PRODUCT_DEFAULT_REQUIRED', subject, 'must have exactly one default Colorway');
      }

      const activeColorways = product.colorways.filter((colorway) => colorway.isActive);
      if (activeColorways.length === 0) {
        addIssue(issues, 'ACTIVE_PRODUCT_WITHOUT_COLORWAY', subject, 'has no active Colorway');
      }

      for (const colorway of activeColorways) {
        const colorwaySubject = `${subject} / Colorway ${colorway.slug}`;
        if (colorway.images.length < 3 || colorway.images.length > 4) {
          addIssue(issues, 'ACTIVE_COLORWAY_IMAGE_COUNT', colorwaySubject, 'must have 3 or 4 images');
        }
        if (colorway.images.filter((image) => image.isThumbnail).length !== 1) {
          addIssue(issues, 'ACTIVE_COLORWAY_THUMBNAIL', colorwaySubject, 'must have exactly one thumbnail');
        }
        if (colorway.variants.length === 0) {
          addIssue(issues, 'ACTIVE_COLORWAY_VARIANT_REQUIRED', colorwaySubject, 'must have at least one Variant');
        }
      }
    }

    for (const colorway of product.colorways) {
      const colorwaySubject = `${subject} / Colorway ${colorway.slug}`;
      const price = Number(colorway.price);
      const salePrice = colorway.salePrice === null ? null : Number(colorway.salePrice);

      if (!Number.isSafeInteger(price) || price <= 0) {
        addIssue(issues, 'INVALID_PRICE', colorwaySubject, 'price must be a positive integer VND amount');
      }
      if (salePrice !== null && (!Number.isSafeInteger(salePrice) || salePrice <= 0 || salePrice >= price)) {
        addIssue(issues, 'INVALID_SALE_PRICE', colorwaySubject, 'sale price must be positive and lower than price');
      }

      const colorFamilies = colorway.colorFamilies ?? [];
      if (
        colorFamilies.length === 0
        || new Set(colorFamilies).size !== colorFamilies.length
        || colorFamilies.some((family) => !supportedColorFamilies.has(family))
      ) {
        addIssue(issues, 'INVALID_COLOR_FAMILIES', colorwaySubject, 'has missing, duplicate or unsupported color families');
      }

      for (const variant of colorway.variants) {
        if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) {
          addIssue(issues, 'INVALID_VARIANT_STOCK', `${colorwaySubject} / Size ${variant.size}`, 'stock must be a non-negative integer');
        }
        if (typeof variant.size !== 'string' || !variant.size.trim()) {
          addIssue(issues, 'INVALID_VARIANT_SIZE', colorwaySubject, 'contains a Variant with an empty size');
        }
      }
    }
  }

  console.log('\n=== RUNTIME CATALOG INVARIANTS ===');
  if (issues.length === 0) {
    console.log('PASS - Admin-managed catalog is internally consistent.');
    return true;
  }

  console.log(`FAIL - ${issues.length} catalog consistency issue(s) found:`);
  for (const issue of issues) {
    console.log(`- [${issue.code}] ${issue.subject}: ${issue.message}`);
  }
  return false;
}

async function verifySeedBaseline(products, counts) {
  const { products: catalogProducts } = await import('../../client/src/data/catalog.js');
  const countChecks = Object.fromEntries(
    Object.entries(EXPECTED_SEED_COUNTS).map(([name, expected]) => [name, counts[name] === expected])
  );

  console.log('\n=== SEED BASELINE COUNTS ===');
  for (const [name, expected] of Object.entries(EXPECTED_SEED_COUNTS)) {
    console.log(`${name}: ${counts[name]} (expected ${expected})`, countChecks[name] ? 'PASS' : 'FAIL');
  }

  let passA = true;
  let passB = true;
  let passC = true;
  let passD = true;
  let passF = true;
  let passG = true;
  let passH = true;
  const threeImageColorways = [];

  for (const product of products) {
    if (product.colorways.length !== 4) passA = false;
    if (product.colorways.filter((colorway) => colorway.isDefault).length !== 1) passB = false;

    for (const colorway of product.colorways) {
      const sizes = colorway.variants.map((variant) => variant.size).sort();
      if (
        colorway.variants.length !== EXPECTED_SEED_SIZES.length
        || JSON.stringify(sizes) !== JSON.stringify([...EXPECTED_SEED_SIZES].sort())
      ) passC = false;
      if (colorway.images.length !== 3 && colorway.images.length !== 4) passD = false;
      if (colorway.images.length === 3) threeImageColorways.push(`${product.slug}/${colorway.slug}`);
      if (colorway.images.filter((image) => image.isThumbnail).length !== 1) passF = false;
      if (colorway.variants.some((variant) => variant.stock < 0)) passG = false;
      if (!colorway.variants.some((variant) => variant.stock > 0)) passH = false;
    }
  }

  const passE = threeImageColorways.length === 6;
  const saleProductSlugs = products
    .filter((product) => product.colorways.some((colorway) => colorway.salePrice !== null))
    .map((product) => product.slug)
    .sort();
  const passI = JSON.stringify(saleProductSlugs) === JSON.stringify(EXPECTED_SEED_SALE_SLUGS);

  const categoryCounts = {};
  for (const product of products) {
    for (const { category } of product.productCategories) {
      categoryCounts[category.slug] = (categoryCounts[category.slug] ?? 0) + 1;
    }
  }
  const passJ = categoryCounts.classic === 13
    && categoryCounts.lifestyle === 12
    && categoryCounts.streetwear === 10
    && categoryCounts.running === 5;

  const featuredSlugs = products.filter((product) => product.isFeatured).map((product) => product.slug).sort();
  const passK = JSON.stringify(featuredSlugs) === JSON.stringify(EXPECTED_SEED_FEATURED_SLUGS);

  const catalogMap = new Map(catalogProducts.map((product) => [product.slug, product.createdAt]));
  const createdAtMismatches = products.flatMap((product) => {
    const expectedCreatedAt = catalogMap.get(product.slug);
    if (!expectedCreatedAt) return [{ slug: product.slug, error: 'Missing in immutable seed catalog' }];
    const expectedIso = new Date(expectedCreatedAt).toISOString();
    return product.createdAt.toISOString() === expectedIso
      ? []
      : [{ slug: product.slug, database: product.createdAt.toISOString(), expected: expectedIso }];
  });
  const passL = createdAtMismatches.length === 0;

  console.log('\n=== SEED BASELINE ASSERTIONS ===');
  console.log('A. Every seed Product has exactly 4 Colorways:', passA ? 'PASS' : 'FAIL');
  console.log('B. Every seed Product has exactly 1 default Colorway:', passB ? 'PASS' : 'FAIL');
  console.log('C. Every seed Colorway has EU sizes 36-44:', passC ? 'PASS' : 'FAIL');
  console.log('D. Every seed Colorway has 3 or 4 images:', passD ? 'PASS' : 'FAIL');
  console.log('E. Exactly 6 seed Colorways have 3 images:', passE ? 'PASS' : 'FAIL');
  console.log('F. Every seed Colorway has exactly 1 thumbnail:', passF ? 'PASS' : 'FAIL');
  console.log('G. No seed Variant stock is negative:', passG ? 'PASS' : 'FAIL');
  console.log('H. Every seed Colorway has available stock:', passH ? 'PASS' : 'FAIL');
  console.log('I. Seed sale Product set matches:', passI ? 'PASS' : 'FAIL', saleProductSlugs);
  console.log('J. Seed Category counts match:', passJ ? 'PASS' : 'FAIL', categoryCounts);
  console.log('K. Seed Featured Product set matches:', passK ? 'PASS' : 'FAIL', featuredSlugs);
  console.log('L. Seed Product createdAt values match:', passL ? 'PASS' : 'FAIL');
  if (!passL) console.log('   Mismatches:', createdAtMismatches);

  return Object.values(countChecks).every(Boolean)
    && [passA, passB, passC, passD, passE, passF, passG, passH, passI, passJ, passK, passL].every(Boolean);
}

async function printInformationalCounts(counts) {
  const [users, adminAccounts, orders, orderItems, orderStatusHistories, reviews] = await Promise.all([
    prisma.user.count(),
    prisma.adminAccount.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderStatusHistory.count(),
    prisma.review.count(),
  ]);

  console.log('\n=== INFORMATIONAL COUNTS ===');
  for (const [name, count] of Object.entries(counts)) console.log(`${name}:`, count);
  console.log('users:', users);
  console.log('admin_accounts:', adminAccounts);
  console.log('orders:', orders);
  console.log('order_items:', orderItems);
  console.log('order_status_histories:', orderStatusHistories);
  console.log('reviews:', reviews);
}

async function verify() {
  const seedBaselineMode = process.argv.includes(SEED_BASELINE_FLAG);

  try {
    const [counts, products] = await Promise.all([loadCatalogCounts(), loadProducts()]);
    console.log(`=== CATALOG VERIFICATION MODE: ${seedBaselineMode ? 'SEED BASELINE' : 'RUNTIME CONSISTENCY'} ===`);

    const passed = seedBaselineMode
      ? await verifySeedBaseline(products, counts)
      : verifyRuntimeCatalog(products);

    await printInformationalCounts(counts);
    console.log('\n=== CATALOG VERIFICATION RESULT ===');
    console.log(passed ? 'PASS' : 'FAIL');
    if (!passed) process.exitCode = 1;
  } catch (error) {
    console.error('Catalog verification error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

verify();
