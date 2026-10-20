import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { issueMemberToken } from '../src/utils/memberToken.js';

const TEST_EMAILS = [
  'm9a.review.a@example.test',
  'm9a.review.b@example.test',
  'm9a.review.status@example.test',
  'm9a.review.multiple@example.test',
  'm9a.review.analytics@example.test',
];
const TEST_PHONE = '0900000901';
const TEST_PASSWORD = 'member-pass-9a';
const TEST_MARKER = 'M9A Review Integration';

let server;
let baseUrl;
let baselineCounts;
let members;
let products;
let originalCatalogState;
let orderSequence = 0;

async function counts() {
  const [users, orders, orderItems, orderStatusHistories, reviews] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderStatusHistory.count(),
    prisma.review.count(),
  ]);
  return { users, orders, orderItems, orderStatusHistories, reviews };
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

async function createTestOrder({ memberId = null, product, variant, status }) {
  orderSequence += 1;
  const now = new Date();
  const colorway = product.colorways.find((candidate) => (
    candidate.variants.some((candidateVariant) => candidateVariant.id === variant.id)
  ));
  assert.ok(colorway, 'test variant must belong to the supplied Product');
  return prisma.order.create({
    data: {
      orderCode: `M9A-${process.pid}-${orderSequence}`,
      userId: memberId,
      status,
      paymentMethod: 'COD',
      receiverName: TEST_MARKER,
      receiverPhone: TEST_PHONE,
      receiverAddress: 'M9A Test Address',
      subtotal: 100000,
      shippingFee: 0,
      total: 100000,
      ...(status === 'COMPLETED' ? { completedAt: now } : {}),
      orderItems: {
        create: {
          variantId: variant.id,
          productName: product.name,
          colorwayName: colorway.name,
          size: variant.size,
          unitPrice: 100000,
          quantity: 1,
        },
      },
      statusHistories: { create: { status, changedAt: now } },
    },
  });
}

function assertNoForbiddenKeys(value, forbiddenKeys) {
  const forbidden = new Set(forbiddenKeys);
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      assert.equal(forbidden.has(key), false, `private field leaked: ${key}`);
      visit(child);
    }
  }
  visit(value);
}

before(async () => {
  baselineCounts = await counts();

  const constraints = await prisma.$queryRawUnsafe(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid = $1::regclass`,
    'reviews'
  );
  assert.ok(constraints.some((constraint) => (
    constraint.conname === 'chk_reviews_rating'
    && constraint.definition.includes('rating >= 1')
    && constraint.definition.includes('rating <= 5')
  )), 'running database must enforce the Review rating range');

  const reviewIndexes = await prisma.$queryRawUnsafe(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = current_schema() AND tablename = $1`,
    'reviews'
  );
  assert.ok(reviewIndexes.some((index) => (
    index.indexname === 'reviews_product_id_user_id_key'
    && index.indexdef.includes('UNIQUE')
  )), 'running database must enforce one Review per Product and User');

  products = await prisma.product.findMany({
    where: { reviews: { none: {} } },
    orderBy: { id: 'asc' },
    take: 3,
    include: {
      colorways: {
        orderBy: { id: 'asc' },
        include: { variants: { orderBy: { id: 'asc' } } },
      },
    },
  });
  assert.equal(products.length, 3, 'three catalog products are required');
  for (const product of products) {
    assert.ok(product.colorways[0]?.variants[0], 'each test product needs a variant');
  }

  originalCatalogState = {
    productId: products[1].id,
    productIsActive: products[1].isActive,
    colorwayId: products[1].colorways[0].id,
    colorwayIsActive: products[1].colorways[0].isActive,
  };

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  members = await Promise.all(TEST_EMAILS.map((email, index) => prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: index === 1 ? '   ' : `M9A Member ${index + 1}`,
      phone: TEST_PHONE,
    },
  })));

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (originalCatalogState) {
    await Promise.all([
      prisma.$executeRawUnsafe(
        'UPDATE products SET is_active = $1 WHERE id = $2',
        originalCatalogState.productIsActive,
        originalCatalogState.productId
      ),
      prisma.$executeRawUnsafe(
        'UPDATE colorways SET is_active = $1 WHERE id = $2',
        originalCatalogState.colorwayIsActive,
        originalCatalogState.colorwayId
      ),
    ]);
  }

  const testUsers = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true },
  });
  const testUserIds = testUsers.map((user) => user.id);
  if (testUserIds.length > 0) {
    await prisma.review.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  }
  await prisma.order.deleteMany({ where: { receiverName: TEST_MARKER } });

  assert.deepEqual(await counts(), baselineCounts);
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('Milestone 9A Review backend and eligibility', async (t) => {
  const [memberA, memberB, statusMember, multipleMember, analyticsMember] = members;
  const [productA, productB, productC] = products;
  const variantA = productA.colorways[0].variants[0];
  const variantB = productB.colorways[0].variants[0];
  const variantC = productC.colorways[0].variants[0];
  const alternateVariantA = productA.colorways[1]?.variants[0] ?? variantA;
  const tokenA = issueMemberToken(memberA);
  const tokenB = issueMemberToken(memberB);
  const statusToken = issueMemberToken(statusMember);
  const multipleToken = issueMemberToken(multipleMember);

  let memberAProductAOrder;
  let memberAReviewId;

  await t.test('eligibility requires an owned COMPLETED order for the target Product', async () => {
    const noOrders = await api(`/api/member/products/${productA.slug}/review-state`, {
      token: tokenA,
    });
    assert.equal(noOrders.status, 200);
    assert.deepEqual(noOrders.body.data, { eligible: false, ownReview: null });

    await createTestOrder({
      memberId: statusMember.id,
      product: productA,
      variant: variantA,
      status: 'COMPLETED',
    });
    for (const status of ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED']) {
      await createTestOrder({
        memberId: statusMember.id,
        product: productB,
        variant: variantB,
        status,
      });
    }
    await createTestOrder({
      product: productB,
      variant: variantB,
      status: 'COMPLETED',
    });

    const nonCompleted = await api(`/api/member/products/${productB.slug}/review-state`, {
      token: statusToken,
    });
    assert.deepEqual(nonCompleted.body.data, { eligible: false, ownReview: null });

    const notEligibleCreate = await api(`/api/products/${productB.slug}/reviews`, {
      method: 'POST',
      token: statusToken,
      body: { rating: 5, comment: 'Not eligible yet' },
    });
    assert.equal(notEligibleCreate.status, 403);
    assert.equal(notEligibleCreate.body.error.code, 'REVIEW_NOT_ELIGIBLE');

    await createTestOrder({
      memberId: statusMember.id,
      product: productB,
      variant: variantB,
      status: 'COMPLETED',
    });
    const completed = await api(`/api/member/products/${productB.slug}/review-state`, {
      token: statusToken,
    });
    assert.deepEqual(completed.body.data, { eligible: true, ownReview: null });

    await Promise.all([
      prisma.$executeRawUnsafe(
        'UPDATE products SET is_active = FALSE WHERE id = $1',
        productB.id
      ),
      prisma.$executeRawUnsafe(
        'UPDATE colorways SET is_active = FALSE WHERE id = $1',
        productB.colorways[0].id
      ),
    ]);
    const inactiveCatalog = await api(`/api/member/products/${productB.slug}/review-state`, {
      token: statusToken,
    });
    assert.equal(inactiveCatalog.body.data.eligible, true);
    await Promise.all([
      prisma.$executeRawUnsafe(
        'UPDATE products SET is_active = $1 WHERE id = $2',
        originalCatalogState.productIsActive,
        productB.id
      ),
      prisma.$executeRawUnsafe(
        'UPDATE colorways SET is_active = $1 WHERE id = $2',
        originalCatalogState.colorwayIsActive,
        productB.colorways[0].id
      ),
    ]);

    await createTestOrder({
      memberId: multipleMember.id,
      product: productA,
      variant: variantA,
      status: 'COMPLETED',
    });
    await createTestOrder({
      memberId: multipleMember.id,
      product: productA,
      variant: alternateVariantA,
      status: 'COMPLETED',
    });
    const multiple = await api(`/api/member/products/${productA.slug}/review-state`, {
      token: multipleToken,
    });
    assert.equal(multiple.body.data.eligible, true);

    memberAProductAOrder = await createTestOrder({
      memberId: memberA.id,
      product: productA,
      variant: variantA,
      status: 'COMPLETED',
    });
    await createTestOrder({
      memberId: memberB.id,
      product: productA,
      variant: variantA,
      status: 'COMPLETED',
    });
  });

  await t.test('create validates payload, auth, eligibility, and duplicate rules', async () => {
    const guest = await api(`/api/products/${productA.slug}/reviews`, {
      method: 'POST',
      body: { rating: 5, comment: 'Guest' },
    });
    assert.equal(guest.status, 401);
    assert.equal(guest.body.error.code, 'UNAUTHORIZED');

    const invalidToken = await api(`/api/products/${productA.slug}/reviews`, {
      method: 'POST',
      token: 'invalid-token',
      body: { rating: 5, comment: 'Invalid token' },
    });
    assert.equal(invalidToken.status, 401);
    assert.equal(invalidToken.body.error.code, 'UNAUTHORIZED');

    const invalidBodies = [
      {},
      { rating: 0, comment: 'Zero' },
      { rating: 6, comment: 'Six' },
      { rating: 1.5, comment: 'Decimal' },
      { rating: '5', comment: 'String' },
      { rating: 5 },
      { rating: 5, comment: '' },
      { rating: 5, comment: '   ' },
      { rating: 5, comment: 'Valid', userId: memberA.id },
      { rating: 5, comment: 'Valid', productId: productA.id },
      { rating: 5, comment: 'Valid', createdAt: new Date().toISOString() },
      { rating: 5, comment: 'Valid', unknown: true },
    ];
    for (const body of invalidBodies) {
      const response = await api(`/api/products/${productC.slug}/reviews`, {
        method: 'POST', token: tokenA, body,
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    }

    const ratingOne = await api(`/api/products/${productA.slug}/reviews`, {
      method: 'POST',
      token: tokenA,
      body: { rating: 1, comment: '  Product A review  ' },
    });
    assert.equal(ratingOne.status, 201);
    assert.equal(ratingOne.body.data.rating, 1);
    assert.equal(ratingOne.body.data.comment, 'Product A review');
    memberAReviewId = ratingOne.body.data.reviewId;

    const ratingFive = await api(`/api/products/${productA.slug}/reviews`, {
      method: 'POST',
      token: tokenB,
      body: { rating: 5, comment: 'Product A second review' },
    });
    assert.equal(ratingFive.status, 201);

    const duplicate = await api(`/api/products/${productA.slug}/reviews`, {
      method: 'POST',
      token: tokenA,
      body: { rating: 3, comment: 'Duplicate' },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'REVIEW_ALREADY_EXISTS');

    for (const endpoint of [
      `/api/products/not-a-real-product/reviews`,
      `/api/member/products/not-a-real-product/review-state`,
    ]) {
      const response = await api(endpoint, {
        method: endpoint.includes('/member/') ? 'GET' : 'POST',
        token: tokenA,
        ...(endpoint.includes('/member/') ? {} : { body: { rating: 5, comment: 'Unknown' } }),
      });
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, 'PRODUCT_NOT_FOUND');
    }
  });

  await t.test('concurrent duplicate create permits exactly one Review', async () => {
    await createTestOrder({
      memberId: memberA.id,
      product: productB,
      variant: variantB,
      status: 'COMPLETED',
    });
    const path = `/api/products/${productB.slug}/reviews`;
    const responses = await Promise.all([
      api(path, { method: 'POST', token: tokenA, body: { rating: 3, comment: 'Race A' } }),
      api(path, { method: 'POST', token: tokenA, body: { rating: 4, comment: 'Race B' } }),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal(responses.find((response) => response.status === 409).body.error.code, 'REVIEW_ALREADY_EXISTS');
    assert.equal(await prisma.review.count({
      where: { productId: productB.id, userId: memberA.id },
    }), 1);
  });

  await t.test('owner may partially edit without rechecking purchase eligibility', async () => {
    await prisma.order.update({
      where: { id: memberAProductAOrder.id },
      data: { status: 'PENDING', completedAt: null },
    });

    const ratingChangedBaseline = new Date('2020-01-01T00:00:00.000Z');
    await prisma.review.update({
      where: { id: memberAReviewId },
      data: {
        rating: 4,
        comment: 'Tốt',
        updatedAt: ratingChangedBaseline,
      },
    });
    const ratingOnly = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH', token: tokenA, body: { rating: 5 },
    });
    assert.equal(ratingOnly.status, 200);
    assert.equal(ratingOnly.body.data.rating, 5);
    assert.equal(ratingOnly.body.data.comment, 'Tốt');
    assert.notEqual(ratingOnly.body.data.updatedAt, ratingChangedBaseline.toISOString());
    const storedRatingChange = await prisma.review.findUnique({
      where: { id: memberAReviewId },
    });
    assert.equal(storedRatingChange.rating, 5);
    assert.equal(storedRatingChange.comment, 'Tốt');
    assert.notEqual(storedRatingChange.updatedAt.toISOString(), ratingChangedBaseline.toISOString());

    const commentChangedBaseline = new Date('2020-01-02T00:00:00.000Z');
    await prisma.review.update({
      where: { id: memberAReviewId },
      data: {
        rating: 5,
        comment: 'Tốt',
        updatedAt: commentChangedBaseline,
      },
    });
    const commentOnly = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH', token: tokenA, body: { comment: '  Rất tốt  ' },
    });
    assert.equal(commentOnly.status, 200);
    assert.equal(commentOnly.body.data.rating, 5);
    assert.equal(commentOnly.body.data.comment, 'Rất tốt');
    assert.notEqual(commentOnly.body.data.updatedAt, commentChangedBaseline.toISOString());
    const storedCommentChange = await prisma.review.findUnique({
      where: { id: memberAReviewId },
    });
    assert.equal(storedCommentChange.rating, 5);
    assert.equal(storedCommentChange.comment, 'Rất tốt');
    assert.notEqual(storedCommentChange.updatedAt.toISOString(), commentChangedBaseline.toISOString());

    const noOpBaseline = new Date('2020-01-03T00:00:00.000Z');
    await prisma.review.update({
      where: { id: memberAReviewId },
      data: {
        rating: 5,
        comment: 'Sản phẩm tốt',
        updatedAt: noOpBaseline,
      },
    });
    const exactNoOp = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { rating: 5, comment: 'Sản phẩm tốt' },
    });
    assert.equal(exactNoOp.status, 200);
    assert.equal(exactNoOp.body.data.rating, 5);
    assert.equal(exactNoOp.body.data.comment, 'Sản phẩm tốt');
    assert.equal(exactNoOp.body.data.updatedAt, noOpBaseline.toISOString());

    const whitespaceNoOp = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { comment: '   Sản phẩm tốt   ' },
    });
    assert.equal(whitespaceNoOp.status, 200);
    assert.equal(whitespaceNoOp.body.data.comment, 'Sản phẩm tốt');
    assert.equal(whitespaceNoOp.body.data.updatedAt, noOpBaseline.toISOString());

    const partialNoOp = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH', token: tokenA, body: { rating: 5 },
    });
    assert.equal(partialNoOp.status, 200);
    assert.equal(partialNoOp.body.data.rating, 5);
    assert.equal(partialNoOp.body.data.comment, 'Sản phẩm tốt');
    assert.equal(partialNoOp.body.data.updatedAt, noOpBaseline.toISOString());
    const storedNoOp = await prisma.review.findUnique({
      where: { id: memberAReviewId },
    });
    assert.equal(storedNoOp.rating, 5);
    assert.equal(storedNoOp.comment, 'Sản phẩm tốt');
    assert.equal(storedNoOp.updatedAt.toISOString(), noOpBaseline.toISOString());

    const both = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH', token: tokenA, body: { rating: 4, comment: 'Final comment' },
    });
    assert.equal(both.status, 200);
    assert.equal(both.body.data.rating, 4);

    const ownState = await api(`/api/member/products/${productA.slug}/review-state`, {
      token: tokenA,
    });
    assert.equal(ownState.body.data.eligible, true);
    assert.equal(ownState.body.data.ownReview.reviewId, memberAReviewId);

    const other = await api(`/api/reviews/${memberAReviewId}`, {
      method: 'PATCH', token: tokenB, body: { rating: 1 },
    });
    const afterOtherAttempt = await prisma.review.findUnique({
      where: { id: memberAReviewId },
    });
    const missing = await api('/api/reviews/999999999', {
      method: 'PATCH', token: tokenA, body: { rating: 1 },
    });
    assert.equal(other.status, 404);
    assert.equal(missing.status, 404);
    assert.deepEqual(other.body.error, missing.body.error);
    assert.equal(afterOtherAttempt.rating, 4);
    assert.equal(afterOtherAttempt.comment, 'Final comment');
    assert.equal(afterOtherAttempt.updatedAt.toISOString(), both.body.data.updatedAt);

    for (const body of [
      {},
      { rating: 0 },
      { rating: 1.5 },
      { comment: ' ' },
      { userId: memberB.id },
      { productId: productB.id },
      { updatedAt: new Date().toISOString() },
    ]) {
      const invalid = await api(`/api/reviews/${memberAReviewId}`, {
        method: 'PATCH', token: tokenA, body,
      });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }
    assert.equal(await prisma.review.count({
      where: { productId: productA.id, userId: memberA.id },
    }), 1);
  });

  await t.test('public list returns summary, deterministic pagination, and no internal IDs or PII', async () => {
    const publicList = await api(`/api/products/${productA.slug}/reviews?page=1&limit=1`);
    assert.equal(publicList.status, 200);
    assert.deepEqual(publicList.body.data.summary, {
      averageRating: 4.5,
      reviewCount: 2,
      distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
    });
    assert.deepEqual(publicList.body.data.pagination, {
      page: 1, limit: 1, totalItems: 2, totalPages: 2,
    });
    assert.equal(publicList.body.data.reviews.length, 1);
    assert.equal(publicList.body.data.reviews[0].member.displayName, 'Thành viên STEP/LAB');
    assertNoForbiddenKeys(publicList.body.data, [
      'id', 'reviewId', 'userId', 'productId', 'email', 'phone', 'address',
      'orderId', 'orderCode',
    ]);

    const secondPage = await api(`/api/products/${productA.slug}/reviews?page=2&limit=1`);
    assert.equal(secondPage.status, 200);
    assert.equal(secondPage.body.data.reviews[0].member.displayName, 'M9A Member 1');

    const noReviews = await api(`/api/products/${productC.slug}/reviews`);
    assert.deepEqual(noReviews.body.data.summary, {
      averageRating: null,
      reviewCount: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
    assert.deepEqual(noReviews.body.data.reviews, []);

    for (const query of ['page=0', 'page=x', 'limit=0', 'limit=51']) {
      const invalid = await api(`/api/products/${productA.slug}/reviews?${query}`);
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }
    const unknown = await api('/api/products/not-a-real-product/reviews');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, 'PRODUCT_NOT_FOUND');
  });

  await t.test('Member own-review list is private, paginated, and newest first', async () => {
    const listA = await api('/api/member/reviews?page=1&limit=1', { token: tokenA });
    assert.equal(listA.status, 200);
    assert.equal(listA.body.data.pagination.totalItems, 2);
    assert.equal(listA.body.data.pagination.totalPages, 2);
    assert.equal(listA.body.data.reviews.length, 1);
    assert.equal(listA.body.data.reviews[0].product.slug, productB.slug);
    assertNoForbiddenKeys(listA.body.data, ['userId', 'productId', 'email', 'phone', 'address']);

    const listASecond = await api('/api/member/reviews?page=2&limit=1', { token: tokenA });
    assert.equal(listASecond.body.data.reviews[0].product.slug, productA.slug);

    const listB = await api('/api/member/reviews', { token: tokenB });
    assert.equal(listB.body.data.pagination.totalItems, 1);
    assert.equal(listB.body.data.reviews[0].product.slug, productA.slug);
    assert.equal(
      listB.body.data.reviews.some((review) => review.reviewId === memberAReviewId),
      false
    );

    for (const query of ['page=0', 'limit=51']) {
      const invalid = await api(`/api/member/reviews?${query}`, { token: tokenA });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }
  });

  await t.test('batch summaries normalize, deduplicate, cap, and omit unknown Products', async () => {
    const requested = ` ${productB.slug},${productA.slug},${productA.slug},unknown-product,, `;
    const response = await api(`/api/products/review-summaries?slugs=${encodeURIComponent(requested)}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.summaries, [
      { slug: productB.slug, averageRating: response.body.data.summaries[0].averageRating, reviewCount: 1 },
      { slug: productA.slug, averageRating: 4.5, reviewCount: 2 },
    ]);
    assert.ok([3, 4].includes(response.body.data.summaries[0].averageRating));

    const noReview = await api(`/api/products/review-summaries?slugs=${productC.slug}`);
    assert.deepEqual(noReview.body.data.summaries, [
      { slug: productC.slug, averageRating: null, reviewCount: 0 },
    ]);

    for (const query of [
      '',
      'slugs=,,,',
      'slugs=bad%20slug',
      `slugs=${productA.slug}&slugs=${productB.slug}`,
      `slugs=${Array.from({ length: 51 }, (_, index) => `valid-slug-${index}`).join(',')}`,
    ]) {
      const invalid = await api(`/api/products/review-summaries${query ? `?${query}` : ''}`);
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }
  });

  await t.test('public analytics remain global while rating filters control list pagination', async () => {
    const analyticsUsers = [memberA, memberB, statusMember, multipleMember];
    const seedRatings = [5, 5, 4, 4];
    const seededReviews = [];
    for (let index = 0; index < analyticsUsers.length; index += 1) {
      seededReviews.push(await prisma.review.create({
        data: {
          productId: productC.id,
          userId: analyticsUsers[index].id,
          rating: seedRatings[index],
          comment: `Analytics review ${index + 1}`,
          createdAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
          updatedAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
        },
      }));
    }

    const beforeNewReview = await api(`/api/products/${productC.slug}/reviews`);
    assert.deepEqual(beforeNewReview.body.data.summary, {
      averageRating: 4.5,
      reviewCount: 4,
      distribution: { 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
    });

    await createTestOrder({
      memberId: analyticsMember.id,
      product: productC,
      variant: variantC,
      status: 'COMPLETED',
    });
    const analyticsToken = issueMemberToken(analyticsMember);
    const created = await api(`/api/products/${productC.slug}/reviews`, {
      method: 'POST',
      token: analyticsToken,
      body: { rating: 3, comment: 'Analytics review 5' },
    });
    assert.equal(created.status, 201);

    const allReviews = await api(`/api/products/${productC.slug}/reviews`);
    const expectedSummary = {
      averageRating: 4.2,
      reviewCount: 5,
      distribution: { 5: 2, 4: 2, 3: 1, 2: 0, 1: 0 },
    };
    assert.deepEqual(allReviews.body.data.summary, expectedSummary);

    const expectedFilteredTotals = new Map([[5, 2], [4, 2], [3, 1], [2, 0], [1, 0]]);
    for (const [rating, totalItems] of expectedFilteredTotals) {
      const filtered = await api(
        `/api/products/${productC.slug}/reviews?rating=${rating}&page=1&limit=1`
      );
      assert.equal(filtered.status, 200);
      assert.deepEqual(filtered.body.data.summary, expectedSummary);
      assert.equal(filtered.body.data.pagination.totalItems, totalItems);
      assert.equal(filtered.body.data.pagination.totalPages, Math.ceil(totalItems / 1));
      assert.equal(filtered.body.data.reviews.length, Math.min(totalItems, 1));
      assert.ok(filtered.body.data.reviews.every((review) => review.rating === rating));
    }

    const ratingFiveFirst = await api(
      `/api/products/${productC.slug}/reviews?rating=5&page=1&limit=1`
    );
    const ratingFiveSecond = await api(
      `/api/products/${productC.slug}/reviews?rating=5&page=2&limit=1`
    );
    assert.equal(ratingFiveFirst.body.data.reviews[0].comment, 'Analytics review 2');
    assert.equal(ratingFiveSecond.body.data.reviews[0].comment, 'Analytics review 1');

    for (const rating of ['0', '6', '1.5', 'abc', '', '5&rating=4']) {
      const invalid = await api(`/api/products/${productC.slug}/reviews?rating=${rating}`);
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }

    const edited = await api(`/api/reviews/${seededReviews[0].id}`, {
      method: 'PATCH',
      token: tokenA,
      body: { rating: 4 },
    });
    assert.equal(edited.status, 200);
    const afterEdit = await api(`/api/products/${productC.slug}/reviews?rating=5`);
    assert.deepEqual(afterEdit.body.data.summary, {
      averageRating: 4,
      reviewCount: 5,
      distribution: { 5: 1, 4: 3, 3: 1, 2: 0, 1: 0 },
    });
    assert.equal(afterEdit.body.data.pagination.totalItems, 1);
    assert.equal(afterEdit.body.data.reviews.length, 1);
  });

  await t.test('database rejects an out-of-range rating independently of API validation', async () => {
    await assert.rejects(
      prisma.review.create({
        data: {
          productId: productC.id,
          userId: statusMember.id,
          rating: 6,
          comment: 'Database constraint test',
        },
      })
    );
    assert.equal(await prisma.review.count({
      where: { productId: productC.id, userId: statusMember.id, rating: 6 },
    }), 0);
  });
});
