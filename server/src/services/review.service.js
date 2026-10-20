import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_BATCH_SLUGS = 50;
const PRODUCT_SLUG_MAX_LENGTH = 200;
const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEW_FIELDS = new Set(['rating', 'comment']);
const MEMBER_FALLBACK_NAME = 'Thành viên STEP/LAB';

function validationError(message, issues) {
  return new AppError(message, 400, 'VALIDATION_ERROR', issues);
}

function productNotFoundError() {
  return new AppError('Không tìm thấy sản phẩm.', 404, 'PRODUCT_NOT_FOUND');
}

function reviewNotFoundError() {
  return new AppError('Không tìm thấy đánh giá.', 404, 'REVIEW_NOT_FOUND');
}

function parsePositiveInteger(value, fallback, field, maximum = null) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`${field} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum !== null && parsed > maximum)) {
    throw validationError(
      maximum === null
        ? `${field} must be a positive integer`
        : `${field} must be between 1 and ${maximum}`
    );
  }
  return parsed;
}

export function parseReviewPagination(query = {}) {
  return {
    page: parsePositiveInteger(query.page, DEFAULT_PAGE, 'page'),
    limit: parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit', MAX_LIMIT),
  };
}

function parseRatingFilter(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[1-5]$/.test(value)) {
    throw validationError('rating must be an integer between 1 and 5');
  }
  return Number(value);
}

function buildRatingDistribution(groups) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const group of groups) distribution[group.rating] = group._count._all;
  return distribution;
}

function normalizeProductSlug(slug) {
  if (typeof slug !== 'string') throw productNotFoundError();
  const normalized = slug.trim().toLowerCase();
  if (
    !normalized
    || normalized.length > PRODUCT_SLUG_MAX_LENGTH
    || !PRODUCT_SLUG_PATTERN.test(normalized)
  ) {
    throw productNotFoundError();
  }
  return normalized;
}

export function normalizeSummarySlugs(rawSlugs) {
  if (typeof rawSlugs !== 'string') {
    throw validationError('slugs must be a comma-separated string');
  }

  const normalized = [];
  const seen = new Set();
  for (const rawSlug of rawSlugs.split(',')) {
    const slug = rawSlug.trim().toLowerCase();
    if (!slug) continue;
    if (slug.length > PRODUCT_SLUG_MAX_LENGTH || !PRODUCT_SLUG_PATTERN.test(slug)) {
      throw validationError('slugs contains an invalid product slug');
    }
    if (!seen.has(slug)) {
      seen.add(slug);
      normalized.push(slug);
    }
  }

  if (normalized.length === 0) {
    throw validationError('At least one product slug is required');
  }
  if (normalized.length > MAX_BATCH_SLUGS) {
    throw validationError(`A maximum of ${MAX_BATCH_SLUGS} unique product slugs is allowed`);
  }
  return normalized;
}

function validateReviewBody(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Review body must be an object');
  }

  const keys = Object.keys(input);
  const unsupportedFields = keys.filter((key) => !REVIEW_FIELDS.has(key));
  if (unsupportedFields.length > 0) {
    throw validationError('Review contains unsupported fields', [
      { fields: unsupportedFields },
    ]);
  }
  if (keys.length === 0) {
    throw validationError('At least one review field is required');
  }

  if (!partial && (!Object.hasOwn(input, 'rating') || !Object.hasOwn(input, 'comment'))) {
    throw validationError('rating and comment are required');
  }

  const data = {};
  if (Object.hasOwn(input, 'rating')) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw validationError('rating must be an integer between 1 and 5');
    }
    data.rating = input.rating;
  }

  if (Object.hasOwn(input, 'comment')) {
    if (typeof input.comment !== 'string' || !input.comment.trim()) {
      throw validationError('comment must be a non-empty string');
    }
    data.comment = input.comment.trim();
  }

  return data;
}

function parseReviewId(rawReviewId) {
  if (typeof rawReviewId !== 'string' || !/^\d+$/.test(rawReviewId)) {
    throw reviewNotFoundError();
  }
  const reviewId = Number(rawReviewId);
  if (!Number.isSafeInteger(reviewId) || reviewId < 1) throw reviewNotFoundError();
  return reviewId;
}

function serializePublicReview(review) {
  const displayName = review.user.fullName.trim() || MEMBER_FALLBACK_NAME;
  return {
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    member: { displayName },
  };
}

function serializeOwnReview(review) {
  return {
    reviewId: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function resolveProduct(slug, dbClient = prisma) {
  const normalizedSlug = normalizeProductSlug(slug);
  const product = await dbClient.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!product) throw productNotFoundError();
  return product;
}

async function hasCompletedPurchase(memberId, productId, dbClient = prisma) {
  const qualifyingOrder = await dbClient.order.findFirst({
    where: {
      userId: memberId,
      status: 'COMPLETED',
      orderItems: {
        some: {
          variant: {
            colorway: { productId },
          },
        },
      },
    },
    select: { id: true },
  });
  return qualifyingOrder !== null;
}

export async function listPublicReviews(slug, rawQuery) {
  const product = await resolveProduct(slug);
  const { page, limit } = parseReviewPagination(rawQuery);
  const rating = parseRatingFilter(rawQuery?.rating);
  const skip = (page - 1) * limit;
  const productWhere = { productId: product.id };
  const listWhere = rating === null ? productWhere : { ...productWhere, rating };

  const [reviews, filteredCount, aggregate, ratingGroups] = await Promise.all([
    prisma.review.findMany({
      where: listWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
      select: {
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { fullName: true } },
      },
    }),
    rating === null ? null : prisma.review.count({ where: listWhere }),
    prisma.review.aggregate({
      where: productWhere,
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: productWhere,
      _count: { _all: true },
    }),
  ]);

  const reviewCount = aggregate._count._all;
  const totalItems = filteredCount ?? reviewCount;
  return {
    summary: {
      averageRating: aggregate._avg.rating,
      reviewCount,
      distribution: buildRatingDistribution(ratingGroups),
    },
    reviews: reviews.map(serializePublicReview),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function listReviewSummaries(rawSlugs) {
  const slugs = normalizeSummarySlugs(rawSlugs);
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const aggregates = products.length === 0
    ? []
    : await prisma.review.groupBy({
        by: ['productId'],
        where: { productId: { in: products.map((product) => product.id) } },
        _avg: { rating: true },
        _count: { _all: true },
      });
  const aggregateByProductId = new Map(
    aggregates.map((aggregate) => [aggregate.productId, aggregate])
  );

  return {
    summaries: slugs.flatMap((slug) => {
      const product = productBySlug.get(slug);
      if (!product) return [];
      const aggregate = aggregateByProductId.get(product.id);
      const reviewCount = aggregate?._count._all ?? 0;
      const averageRating = aggregate?._avg.rating ?? null;
      return [{ slug, averageRating, reviewCount }];
    }),
  };
}

export async function getMemberReviewState(memberId, slug) {
  const product = await resolveProduct(slug);
  const ownReview = await prisma.review.findUnique({
    where: {
      productId_userId: { productId: product.id, userId: memberId },
    },
  });

  if (ownReview) {
    return { eligible: true, ownReview: serializeOwnReview(ownReview) };
  }

  return {
    eligible: await hasCompletedPurchase(memberId, product.id),
    ownReview: null,
  };
}

export async function createMemberReview(memberId, slug, input) {
  const data = validateReviewBody(input);
  const product = await resolveProduct(slug);

  const existing = await prisma.review.findUnique({
    where: {
      productId_userId: { productId: product.id, userId: memberId },
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError('Bạn đã đánh giá sản phẩm này.', 409, 'REVIEW_ALREADY_EXISTS');
  }

  if (!(await hasCompletedPurchase(memberId, product.id))) {
    throw new AppError(
      'Bạn chỉ có thể đánh giá sản phẩm từ đơn hàng đã hoàn tất.',
      403,
      'REVIEW_NOT_ELIGIBLE'
    );
  }

  try {
    const review = await prisma.review.create({
      data: { ...data, productId: product.id, userId: memberId },
    });
    return serializeOwnReview(review);
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError('Bạn đã đánh giá sản phẩm này.', 409, 'REVIEW_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function updateMemberReview(memberId, rawReviewId, input) {
  const reviewId = parseReviewId(rawReviewId);
  const data = validateReviewBody(input, { partial: true });

  return prisma.$transaction(async (tx) => {
    const currentReview = await tx.review.findFirst({
      where: { id: reviewId, userId: memberId },
    });
    if (!currentReview) throw reviewNotFoundError();

    const candidateRating = Object.hasOwn(data, 'rating')
      ? data.rating
      : currentReview.rating;
    const candidateComment = Object.hasOwn(data, 'comment')
      ? data.comment
      : currentReview.comment;

    if (
      candidateRating === currentReview.rating
      && candidateComment === currentReview.comment
    ) {
      return serializeOwnReview(currentReview);
    }

    const result = await tx.review.updateMany({
      where: { id: reviewId, userId: memberId },
      data,
    });
    if (result.count === 0) throw reviewNotFoundError();

    const review = await tx.review.findUnique({ where: { id: reviewId } });
    return serializeOwnReview(review);
  });
}

export async function listMemberReviews(memberId, rawQuery) {
  const { page, limit } = parseReviewPagination(rawQuery);
  const where = { userId: memberId };
  const [reviews, totalItems] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { slug: true, name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews.map((review) => ({
      ...serializeOwnReview(review),
      product: review.product,
    })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}
