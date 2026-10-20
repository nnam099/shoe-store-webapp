function createReviewApiError(response, data) {
  const error = new Error(
    data?.error?.message || 'Không thể hoàn tất yêu cầu đánh giá lúc này.'
  );
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  return error;
}

async function reviewRequest(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw createReviewApiError(response, data);
  return data?.data;
}

export function getProductReviews(slug, { page = 1, limit = 10, rating = null } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (rating !== null) query.set('rating', String(rating));
  return reviewRequest(`/products/${encodeURIComponent(slug)}/reviews?${query}`);
}

export function getMemberReviewState(token, slug) {
  return reviewRequest(`/member/products/${encodeURIComponent(slug)}/review-state`, {
    token,
  });
}

export function createReview(token, slug, payload) {
  return reviewRequest(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateReview(token, reviewId, payload) {
  return reviewRequest(`/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function getProductReviewSummaries(slugs) {
  if (!slugs || slugs.length === 0) {
    return Promise.resolve({ summaries: [] });
  }
  const slugList = Array.isArray(slugs) ? slugs : [slugs];
  const uniqueSlugs = [...new Set(slugList.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean))];
  if (uniqueSlugs.length === 0) {
    return Promise.resolve({ summaries: [] });
  }
  const query = encodeURIComponent(uniqueSlugs.join(','));
  return reviewRequest(`/products/review-summaries?slugs=${query}`);
}
