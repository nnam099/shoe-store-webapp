import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

const RUN_ID = `${process.pid}-${Date.now()}`;
const PREFIX = 'catalog-api-test';
const TEST_EMAIL = 'catalog-api-test@example.test';

let server;
let baseUrl;
let isolationGuardPassed = false;
let baselineCounts;
let fixture;

async function api(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

async function catalogCounts() {
  const [brands, categories, products, productCategories, colorways, images, variants, users, reviews] =
    await Promise.all([
      prisma.brand.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.productCategory.count(),
      prisma.colorway.count(),
      prisma.productImage.count(),
      prisma.variant.count(),
      prisma.user.count(),
      prisma.review.count(),
    ]);
  return { brands, categories, products, productCategories, colorways, images, variants, users, reviews };
}

async function cleanupFixtures() {
  const products = await prisma.product.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);

  if (productIds.length > 0) {
    const colorways = await prisma.colorway.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    });
    const colorwayIds = colorways.map((colorway) => colorway.id);

    await prisma.review.deleteMany({ where: { productId: { in: productIds } } });
    if (colorwayIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { colorwayId: { in: colorwayIds } } });
      await prisma.variant.deleteMany({ where: { colorwayId: { in: colorwayIds } } });
    }
    await prisma.colorway.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productCategory.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

async function createProduct({
  brandId,
  slugSuffix,
  name,
  isActive = true,
  isFeatured = false,
  createdAt,
  categoryIds = [],
  colorways,
}) {
  return prisma.product.create({
    data: {
      brandId,
      slug: `${PREFIX}-${slugSuffix}`,
      name,
      description: `Integration fixture for ${name}`,
      isActive,
      isFeatured,
      createdAt,
      productCategories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      colorways: {
        create: colorways.map((colorway) => ({
          slug: colorway.slug,
          name: colorway.name,
          price: colorway.price,
          salePrice: colorway.salePrice ?? null,
          isDefault: colorway.isDefault,
          isActive: colorway.isActive ?? true,
          images: {
            create: colorway.images.map((image) => ({
              imageUrl: image.imageUrl,
              displayOrder: image.displayOrder,
              isThumbnail: image.isThumbnail,
            })),
          },
          variants: {
            create: colorway.variants,
          },
        })),
      },
    },
  });
}

function assertNoInternalIds(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoInternalIds);
    return;
  }
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.hasOwn(value, 'id'), false);
  assert.equal(Object.hasOwn(value, 'productId'), false);
  assert.equal(Object.hasOwn(value, 'colorwayId'), false);
  Object.values(value).forEach(assertNoInternalIds);
}

before(async () => {
  const rows = await prisma.$queryRaw`SELECT current_database() AS database`;
  const database = rows[0]?.database;
  assert.equal(typeof database, 'string');
  assert.notEqual(database, 'shoe_store_dev', 'Catalog integration tests refuse development DB');
  assert.match(database, /test/i, 'Catalog integration tests require an isolated test database');
  isolationGuardPassed = true;

  await cleanupFixtures();
  baselineCounts = await catalogCounts();

  const activeBrand = await prisma.brand.create({
    data: {
      slug: `${PREFIX}-brand`,
      name: `Needle Brand ${RUN_ID}`,
      logoUrl: `logos/${PREFIX}.svg`,
      isActive: true,
    },
  });
  const inactiveBrand = await prisma.brand.create({
    data: {
      slug: `${PREFIX}-inactive-brand`,
      name: `Inactive Brand ${RUN_ID}`,
      isActive: false,
    },
  });
  const activeCategory = await prisma.category.create({
    data: { slug: `${PREFIX}-category`, name: `Fixture Category ${RUN_ID}`, isActive: true },
  });
  const inactiveCategory = await prisma.category.create({
    data: {
      slug: `${PREFIX}-inactive-category`,
      name: `Inactive Category ${RUN_ID}`,
      isActive: false,
    },
  });

  const alpha = await createProduct({
    brandId: activeBrand.id,
    slugSuffix: 'alpha',
    name: `ZZ Catalog Alpha ${RUN_ID}`,
    isFeatured: true,
    createdAt: new Date('2024-01-02T00:00:00.000Z'),
    categoryIds: [activeCategory.id, inactiveCategory.id],
    colorways: [
      {
        slug: 'white',
        name: 'White',
        price: 1000,
        salePrice: 800,
        isDefault: true,
        images: [
          { imageUrl: `${PREFIX}/white/2.avif`, displayOrder: 2, isThumbnail: false },
          { imageUrl: `${PREFIX}/white/1.avif`, displayOrder: 1, isThumbnail: true },
        ],
        variants: [
          { size: '36', stock: 2 },
          { size: '38', stock: 0 },
        ],
      },
      {
        slug: 'red',
        name: 'Red',
        price: 500,
        isDefault: false,
        images: [
          { imageUrl: `${PREFIX}/red/1.avif`, displayOrder: 1, isThumbnail: true },
        ],
        variants: [
          { size: '36', stock: 0 },
          { size: '37', stock: 3 },
        ],
      },
      {
        slug: 'blue',
        name: 'Inactive Blue',
        price: 100,
        isDefault: false,
        isActive: false,
        images: [
          { imageUrl: `${PREFIX}/inactive-blue/1.avif`, displayOrder: 1, isThumbnail: true },
        ],
        variants: [{ size: '39', stock: 4 }],
      },
    ],
  });

  const beta = await createProduct({
    brandId: activeBrand.id,
    slugSuffix: 'beta',
    name: `ZZ Catalog Beta ${RUN_ID}`,
    isFeatured: true,
    createdAt: new Date('2024-01-03T00:00:00.000Z'),
    categoryIds: [activeCategory.id],
    colorways: [
      {
        slug: 'black',
        name: 'Black',
        price: 900,
        isDefault: true,
        images: [
          { imageUrl: `${PREFIX}/black/1.avif`, displayOrder: 1, isThumbnail: true },
        ],
        variants: [{ size: '36', stock: 1 }],
      },
    ],
  });

  const inactiveProduct = await createProduct({
    brandId: activeBrand.id,
    slugSuffix: 'inactive-product',
    name: `ZZ Catalog Inactive Product ${RUN_ID}`,
    isActive: false,
    createdAt: new Date('2024-01-04T00:00:00.000Z'),
    categoryIds: [activeCategory.id],
    colorways: [
      {
        slug: 'blue',
        name: 'Blue',
        price: 700,
        isDefault: true,
        images: [{ imageUrl: `${PREFIX}/blue/1.avif`, displayOrder: 1, isThumbnail: true }],
        variants: [{ size: '36', stock: 1 }],
      },
    ],
  });

  const inactiveBrandProduct = await createProduct({
    brandId: inactiveBrand.id,
    slugSuffix: 'inactive-brand-product',
    name: `ZZ Catalog Inactive Brand ${RUN_ID}`,
    createdAt: new Date('2024-01-05T00:00:00.000Z'),
    categoryIds: [activeCategory.id],
    colorways: [
      {
        slug: 'green',
        name: 'Green',
        price: 600,
        isDefault: true,
        images: [{ imageUrl: `${PREFIX}/green/1.avif`, displayOrder: 1, isThumbnail: true }],
        variants: [{ size: '36', stock: 1 }],
      },
    ],
  });

  const invalidDefaultProduct = await createProduct({
    brandId: activeBrand.id,
    slugSuffix: 'invalid-default',
    name: `ZZ Catalog Invalid Default ${RUN_ID}`,
    createdAt: new Date('2024-01-06T00:00:00.000Z'),
    categoryIds: [activeCategory.id],
    colorways: [
      {
        slug: 'white',
        name: 'White',
        price: 400,
        isDefault: true,
        isActive: false,
        images: [{ imageUrl: `${PREFIX}/invalid/1.avif`, displayOrder: 1, isThumbnail: true }],
        variants: [{ size: '36', stock: 1 }],
      },
      {
        slug: 'red',
        name: 'Red',
        price: 400,
        isDefault: false,
        images: [{ imageUrl: `${PREFIX}/valid/1.avif`, displayOrder: 1, isThumbnail: true }],
        variants: [{ size: '36', stock: 1 }],
      },
    ],
  });

  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash: 'not-used-by-catalog-tests',
      fullName: 'Catalog Test Member',
      phone: '0900000999',
    },
  });
  await prisma.review.create({
    data: { userId: user.id, productId: alpha.id, rating: 5, comment: 'Catalog summary fixture' },
  });

  fixture = {
    activeBrand,
    inactiveBrand,
    activeCategory,
    inactiveCategory,
    alpha,
    beta,
    inactiveProduct,
    inactiveBrandProduct,
    invalidDefaultProduct,
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (isolationGuardPassed) {
    await cleanupFixtures();
    assert.deepEqual(await catalogCounts(), baselineCounts);
  }
  await prisma.$disconnect();
});

test('Storefront Catalog public API', async (t) => {
  await t.test('options expose active navigation and Default Colorway price bounds', async () => {
    const response = await api('/api/catalog/options');
    assert.equal(response.status, 200);
    const { data } = response.body;

    const brand = data.brands.find((item) => item.slug === fixture.activeBrand.slug);
    assert.equal(brand.productCount, 2);
    assert.equal(data.brands.some((item) => item.slug === fixture.inactiveBrand.slug), false);

    const category = data.categories.find((item) => item.slug === fixture.activeCategory.slug);
    assert.equal(category.productCount, 2);
    assert.equal(
      data.categories.some((item) => item.slug === fixture.inactiveCategory.slug),
      false
    );
    assert.equal(data.priceRange.min, 800);
    assert.notEqual(data.priceRange.min, 500);
    assert.ok(data.sizes.includes('38'));
    assert.ok(data.colors.some((color) => color.slug === 'red'));
    assertNoInternalIds(data);
  });

  await t.test('search is Product-name-only and visibility is enforced', async () => {
    const productSearch = await api(
      `/api/catalog/products?q=${encodeURIComponent(`ZZ Catalog Alpha ${RUN_ID}`)}`
    );
    assert.equal(productSearch.status, 200);
    assert.deepEqual(productSearch.body.data.products.map((product) => product.slug), [
      fixture.alpha.slug,
    ]);

    const brandOnlySearch = await api(
      `/api/catalog/products?q=${encodeURIComponent(fixture.activeBrand.name)}`
    );
    assert.equal(brandOnlySearch.body.data.pagination.totalItems, 0);

    for (const hiddenProduct of [
      fixture.inactiveProduct,
      fixture.inactiveBrandProduct,
      fixture.invalidDefaultProduct,
    ]) {
      const detail = await api(`/api/catalog/products/${hiddenProduct.slug}`);
      assert.equal(detail.status, 404);
      assert.equal(detail.body.error.code, 'PRODUCT_NOT_FOUND');
    }
  });

  await t.test('Brand and Category filters use OR internally and AND across groups', async () => {
    const response = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug},unknown-brand`
      + `&category=${fixture.activeCategory.slug},unknown-category&limit=50`
    );
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.products.map((product) => product.slug).sort(),
      [fixture.alpha.slug, fixture.beta.slug].sort()
    );

    const unknown = await api('/api/catalog/products?brand=unknown-brand');
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.data.pagination.totalItems, 0);
    assert.equal(unknown.body.data.pagination.totalPages, 0);

    const multiColor = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&color=red,black`
    );
    assert.deepEqual(
      multiColor.body.data.products.map((product) => product.slug).sort(),
      [fixture.alpha.slug, fixture.beta.slug].sort()
    );

    const multiSize = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&size=36,37`
    );
    assert.deepEqual(
      multiSize.body.data.products.map((product) => product.slug).sort(),
      [fixture.alpha.slug, fixture.beta.slug].sort()
    );
  });

  await t.test('Default Colorway remains authoritative without a Color filter', async () => {
    const defaultPrice = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&maxPrice=700`
    );
    assert.equal(defaultPrice.body.data.pagination.totalItems, 0);

    const sizeOnly = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&size=37`
    );
    assert.equal(sizeOnly.body.data.pagination.totalItems, 1);
    assert.equal(sizeOnly.body.data.products[0].slug, fixture.alpha.slug);
    assert.equal(sizeOnly.body.data.products[0].displayColorway.slug, 'white');
    assert.equal(sizeOnly.body.data.products[0].displayColorway.effectivePrice, 800);
  });

  await t.test('Color, Size, and Price resolve on the same matching Colorway', async () => {
    const wrongSize = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&color=red&size=36`
    );
    assert.equal(wrongSize.body.data.pagination.totalItems, 0);

    const matching = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&color=red&size=37&maxPrice=700`
    );
    assert.equal(matching.status, 200);
    assert.equal(matching.body.data.pagination.totalItems, 1);
    assert.equal(matching.body.data.products[0].slug, fixture.alpha.slug);
    assert.equal(matching.body.data.products[0].displayColorway.slug, 'red');
    assert.equal(matching.body.data.products[0].displayColorway.effectivePrice, 500);

    const zeroStock = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&color=red&size=36`
    );
    assert.equal(zeroStock.body.data.pagination.totalItems, 0);
  });

  await t.test('sort, Featured, and pagination run after filtering', async () => {
    const newest = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&featured=true&sort=newest&limit=1&page=1`
    );
    assert.equal(newest.body.data.pagination.totalItems, 2);
    assert.equal(newest.body.data.pagination.totalPages, 2);
    assert.equal(newest.body.data.products[0].slug, fixture.beta.slug);

    const secondPage = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&featured=true&sort=newest&limit=1&page=2`
    );
    assert.equal(secondPage.body.data.products[0].slug, fixture.alpha.slug);

    const sortExpectations = {
      newest: [fixture.beta.slug, fixture.alpha.slug],
      oldest: [fixture.alpha.slug, fixture.beta.slug],
      'price-asc': [fixture.alpha.slug, fixture.beta.slug],
      'price-desc': [fixture.beta.slug, fixture.alpha.slug],
      'name-asc': [fixture.alpha.slug, fixture.beta.slug],
      'name-desc': [fixture.beta.slug, fixture.alpha.slug],
    };
    for (const [sort, expectedSlugs] of Object.entries(sortExpectations)) {
      const sorted = await api(
        `/api/catalog/products?brand=${fixture.activeBrand.slug}&sort=${sort}`
      );
      assert.deepEqual(sorted.body.data.products.map((product) => product.slug), expectedSlugs);
    }

    const beyondLastPage = await api(
      `/api/catalog/products?brand=${fixture.activeBrand.slug}&page=9&limit=1`
    );
    assert.deepEqual(beyondLastPage.body.data.products, []);
    assert.equal(beyondLastPage.body.data.pagination.page, 9);
  });

  await t.test('detail returns ordered images, active categories, and zero-stock sizes', async () => {
    const response = await api(`/api/catalog/products/${fixture.alpha.slug}`);
    assert.equal(response.status, 200);
    const { product } = response.body.data;
    assert.equal(product.defaultColorwaySlug, 'white');
    assert.deepEqual(product.categories, [
      { slug: fixture.activeCategory.slug, name: fixture.activeCategory.name },
    ]);
    assert.equal(product.colorways.length, 2);

    const white = product.colorways.find((colorway) => colorway.slug === 'white');
    assert.deepEqual(white.images, [
      `${PREFIX}/white/1.avif`,
      `${PREFIX}/white/2.avif`,
    ]);
    assert.deepEqual(white.variants, [
      { size: '36', stock: 2 },
      { size: '38', stock: 0 },
    ]);
    assert.deepEqual(product.reviewSummary, { averageRating: 5, reviewCount: 1 });
    assertNoInternalIds(response.body.data);
  });

  await t.test('validation and existing batch Review summaries stay compatible', async () => {
    for (const path of [
      '/api/catalog/products?sort=invalid',
      '/api/catalog/products?page=0',
      '/api/catalog/products?limit=51',
      '/api/catalog/products?minPrice=2&maxPrice=1',
      '/api/catalog/products?featured=yes',
    ]) {
      const response = await api(path);
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    }

    const summaries = await api(
      `/api/products/review-summaries?slugs=${fixture.alpha.slug},${fixture.beta.slug}`
    );
    assert.equal(summaries.status, 200);
    assert.deepEqual(summaries.body.data.summaries, [
      { slug: fixture.alpha.slug, averageRating: 5, reviewCount: 1 },
      { slug: fixture.beta.slug, averageRating: null, reviewCount: 0 },
    ]);
  });
});
