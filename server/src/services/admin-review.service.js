import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  paginationResult,
  parseEnum,
  parseId,
  parsePagination,
  parseSearch,
  validationError,
} from '../utils/adminValidation.js';

const REVIEW_SORTS = ['newest', 'oldest', 'rating-asc', 'rating-desc'];

function reviewNotFound() {
  return new AppError('Không tìm thấy đánh giá.', 404, 'REVIEW_NOT_FOUND');
}

function parseRating(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[1-5]$/.test(value)) {
    throw validationError('rating must be an integer between 1 and 5');
  }
  return Number(value);
}

function reviewOrderBy(sort) {
  const map = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    'rating-asc': { rating: 'asc' },
    'rating-desc': { rating: 'desc' },
  };
  return map[sort];
}

function serializeAdminReview(review) {
  return {
    reviewId: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    product: {
      id: review.product.id,
      slug: review.product.slug,
      name: review.product.name,
    },
    customer: {
      id: review.user.id,
      email: review.user.email,
      fullName: review.user.fullName,
    },
  };
}

const REVIEW_INCLUDE = {
  product: { select: { id: true, slug: true, name: true } },
  user: { select: { id: true, email: true, fullName: true } },
};

export async function listAdminReviews(query = {}) {
  const { page, limit } = parsePagination(query);
  const q = parseSearch(query.q);
  const rating = parseRating(query.rating);
  const productId = query.productId === undefined ? undefined : parseId(query.productId, 'productId');
  const customerId = query.customerId === undefined ? undefined : parseId(query.customerId, 'customerId');
  const sort = parseEnum(query.sort, REVIEW_SORTS, 'sort', 'newest');
  const where = {
    ...(rating === undefined ? {} : { rating }),
    ...(productId === undefined ? {} : { productId }),
    ...(customerId === undefined ? {} : { userId: customerId }),
    ...(q ? {
      OR: [
        { comment: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { slug: { contains: q, mode: 'insensitive' } } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: [reviewOrderBy(sort), { id: sort === 'oldest' || sort === 'rating-asc' ? 'asc' : 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: REVIEW_INCLUDE,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items: items.map(serializeAdminReview),
    pagination: paginationResult(page, limit, totalItems),
  };
}

export async function getAdminReview(rawReviewId) {
  const reviewId = parseId(rawReviewId, 'reviewId');
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: REVIEW_INCLUDE });
  if (!review) throw reviewNotFound();
  return serializeAdminReview(review);
}

export async function deleteAdminReview(rawReviewId) {
  const reviewId = parseId(rawReviewId, 'reviewId');
  const deleted = await prisma.review.deleteMany({ where: { id: reviewId } });
  if (deleted.count !== 1) throw reviewNotFound();
  return { deleted: true, reviewId };
}
