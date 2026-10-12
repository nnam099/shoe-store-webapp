import {
  createMemberReview,
  getMemberReviewState,
  listMemberReviews,
  listPublicReviews,
  listReviewSummaries,
  updateMemberReview,
} from '../services/review.service.js';

export async function getPublicReviews(req, res, next) {
  try {
    const result = await listPublicReviews(req.params.slug, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getReviewSummaries(req, res, next) {
  try {
    const result = await listReviewSummaries(req.query.slugs);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getReviewState(req, res, next) {
  try {
    const result = await getMemberReviewState(req.member.id, req.params.slug);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createReview(req, res, next) {
  try {
    const result = await createMemberReview(req.member.id, req.params.slug, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req, res, next) {
  try {
    const result = await updateMemberReview(req.member.id, req.params.reviewId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMemberReviews(req, res, next) {
  try {
    const result = await listMemberReviews(req.member.id, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
