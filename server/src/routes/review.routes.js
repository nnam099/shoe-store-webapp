import { Router } from 'express';
import {
  createReview,
  getMemberReviews,
  getPublicReviews,
  getReviewState,
  getReviewSummaries,
  updateReview,
} from '../controllers/review.controller.js';
import { requireMember } from '../middlewares/memberAuth.js';

const router = Router();

router.get('/products/review-summaries', getReviewSummaries);
router.get('/products/:slug/reviews', getPublicReviews);
router.post('/products/:slug/reviews', requireMember, createReview);

router.get('/member/products/:slug/review-state', requireMember, getReviewState);
router.get('/member/reviews', requireMember, getMemberReviews);
router.patch('/reviews/:reviewId', requireMember, updateReview);

export default router;
