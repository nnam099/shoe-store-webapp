import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContextValue';
import {
  createReview,
  getMemberReviewState,
  getProductReviews,
  updateReview,
} from '../../services/reviewService';
import ReviewForm from './ReviewForm';
import ReviewRating from './ReviewRating';

const REVIEWS_PER_PAGE = 10;
const RATING_FILTERS = [5, 4, 3, 2, 1];

function formatReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function isReviewEdited(review) {
  if (!review?.createdAt || !review?.updatedAt) return false;

  const createdTime = Date.parse(review.createdAt);
  const updatedTime = Date.parse(review.updatedAt);

  if (!Number.isFinite(createdTime) || !Number.isFinite(updatedTime)) {
    return false;
  }

  return updatedTime > createdTime;
}

function getReviewDisplayDateInfo(review) {
  const isEdited = isReviewEdited(review);
  const displayDate = isEdited ? review.updatedAt : review.createdAt;
  return { isEdited, displayDate };
}

function Summary({ summary }) {
  if (!summary || summary.reviewCount === 0) {
    return (
      <div>
        <p className="text-lg font-bold text-[#121212]">Chưa có đánh giá</p>
        <p className="mt-1.5 text-xs text-[#73736e]">
          Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm.
        </p>
      </div>
    );
  }

  const average = Number(summary.averageRating);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#121212]">
          {average.toFixed(1)}
        </span>
        <span className="text-base font-bold text-[#73736e]">/ 5</span>
      </div>
      <div className="mt-2.5">
        <ReviewRating rating={average} />
      </div>
      <p className="mt-2 text-xs font-medium text-[#73736e]">
        {summary.reviewCount} nhận xét
      </p>
    </div>
  );
}

function RatingDistribution({ summary, selectedRating, onSelect }) {
  if (!summary || summary.reviewCount === 0) return null;

  return (
    <div className="mt-6 border-t border-[#f0f0ec] pt-5">
      <div className="space-y-2">
        {RATING_FILTERS.map((rating) => {
          const count = summary.distribution?.[rating] ?? 0;
          const percentage = summary.reviewCount > 0
            ? (count / summary.reviewCount) * 100
            : 0;
          const active = selectedRating === rating;

          return (
            <button
              key={rating}
              type="button"
              aria-label={`Lọc đánh giá ${rating} sao, ${count} đánh giá`}
              aria-pressed={active}
              onClick={() => onSelect(rating)}
              className={`group flex w-full items-center gap-3 py-1 px-2 -mx-2 rounded-lg text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[#fff5f5]'
                  : 'hover:bg-[#fafaf8]'
              }`}
            >
              <span className={`w-6 shrink-0 text-xs font-bold ${active ? 'text-[#991b1b]' : 'text-[#52524e]'}`}>
                {rating}★
              </span>
              <span
                role="progressbar"
                aria-label={`${percentage.toFixed(0)}% đánh giá ${rating} sao`}
                aria-valuemin="0"
                aria-valuemax={summary.reviewCount}
                aria-valuenow={count}
                className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1f1ee]"
              >
                <span
                  className={`block h-full rounded-full transition-all duration-300 ${
                    active ? 'bg-[#7f1d1d]' : 'bg-[#991b1b]'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </span>
              <span className={`w-6 shrink-0 text-right text-xs font-semibold ${active ? 'text-[#991b1b]' : 'text-[#73736e]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberReviewPanel({
  isAuthenticated,
  isInitializing,
  memberLoading,
  memberError,
  memberState,
  editorMode,
  isSubmitting,
  onRetry,
  onEdit,
  onCreate,
  onCancelEditor,
  onSubmit,
}) {
  if (isInitializing || memberLoading) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
        <p role="status" className="text-xs font-semibold text-[#73736e]">
          Đang tải trạng thái đánh giá...
        </p>
      </div>
    );
  }

  if (memberError) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
        <p role="alert" className="text-xs font-semibold leading-5 text-[#991b1b]">
          {memberError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 min-h-9 rounded-lg border border-[#121212] px-4 text-xs font-bold uppercase tracking-wider hover:bg-[#121212] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
          Đánh giá sản phẩm
        </h3>
        <p className="mt-2 text-xs leading-5 text-[#52524e]">
          Chỉ thành viên đã mua sản phẩm này bằng tài khoản và có đơn hàng hoàn tất mới có thể gửi đánh giá.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#121212] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#991b1b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
        >
          Đăng nhập tài khoản
        </Link>
      </div>
    );
  }

  if (memberState?.ownReview) {
    const ownReview = memberState.ownReview;
    const { isEdited: isOwnEdited, displayDate: ownDisplayDate } = getReviewDisplayDateInfo(ownReview);
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#f0f0ec] pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
            Đánh giá của bạn
          </h3>
          <span className="text-[11px] font-semibold text-[#73736e]">
            <time dateTime={ownDisplayDate}>{formatReviewDate(ownDisplayDate)}</time>
            {isOwnEdited && ' · Đã chỉnh sửa'}
          </span>
        </div>
        {editorMode === 'edit' ? (
          <ReviewForm
            initialReview={ownReview}
            isSubmitting={isSubmitting}
            onCancel={onCancelEditor}
            onSubmit={onSubmit}
          />
        ) : (
          <div className="mt-3.5">
            <div>
              <ReviewRating rating={ownReview.rating} compact />
            </div>
            <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-6 text-[#333330]">
              {ownReview.comment}
            </p>
            <button
              type="button"
              onClick={onEdit}
              className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-[#d4d4ce] bg-white px-3.5 text-xs font-bold uppercase tracking-wider text-[#121212] hover:border-[#991b1b] hover:text-[#991b1b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
            >
              Chỉnh sửa đánh giá
            </button>
          </div>
        )}
      </div>
    );
  }

  if (memberState?.eligible) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
          Viết nhận xét
        </h3>
        {editorMode === 'create' ? (
          <ReviewForm
            isSubmitting={isSubmitting}
            onCancel={onCancelEditor}
            onSubmit={onSubmit}
          />
        ) : (
          <div className="mt-2.5">
            <p className="text-xs leading-5 text-[#52524e]">
              Bạn đã hoàn tất đơn hàng cho sản phẩm này. Hãy chia sẻ cảm nhận để giúp mọi người lựa chọn tốt hơn.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#991b1b] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#7f1d1d] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
            >
              Viết đánh giá ngay
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
        Đánh giá sản phẩm
      </h3>
      <p className="mt-2 text-xs leading-5 text-[#52524e]">
        Bạn chỉ có thể gửi đánh giá sau khi đơn hàng có sản phẩm này chuyển sang trạng thái hoàn tất.
      </p>
    </div>
  );
}

export default function ProductReviews({ productSlug }) {
  const { token, isAuthenticated, isInitializing, clearSession } = useAuth();
  const [reviewPage, setReviewPage] = useState(1);
  const [selectedRating, setSelectedRating] = useState(null);
  const [publicData, setPublicData] = useState(null);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicError, setPublicError] = useState('');
  const [memberState, setMemberState] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [editorMode, setEditorMode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionTone, setActionTone] = useState('success');
  const publicRequestRef = useRef(0);
  const memberRequestRef = useRef(0);

  const handleUnauthorized = useCallback(() => {
    clearSession();
    setMemberState(null);
    setMemberError('');
    setEditorMode(null);
    setActionTone('warning');
    setActionMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục đánh giá.');
  }, [clearSession]);

  const loadPublicReviews = useCallback(async ({
    page = reviewPage,
    rating = selectedRating,
  } = {}) => {
    const requestId = publicRequestRef.current + 1;
    publicRequestRef.current = requestId;
    setPublicLoading(true);
    setPublicError('');
    try {
      const data = await getProductReviews(productSlug, {
        page,
        limit: REVIEWS_PER_PAGE,
        rating,
      });
      if (publicRequestRef.current !== requestId) return false;
      setPublicData(data);
      return true;
    } catch (error) {
      if (publicRequestRef.current !== requestId) return false;
      setPublicError(
        error.code === 'PRODUCT_NOT_FOUND'
          ? 'Dữ liệu đánh giá chưa khớp với sản phẩm này.'
          : 'Không thể tải đánh giá.'
      );
      return false;
    } finally {
      if (publicRequestRef.current === requestId) setPublicLoading(false);
    }
  }, [productSlug, reviewPage, selectedRating]);

  const loadMemberState = useCallback(async () => {
    if (!isAuthenticated || !token) {
      memberRequestRef.current += 1;
      setMemberState(null);
      setMemberLoading(false);
      setMemberError('');
      return false;
    }

    const requestId = memberRequestRef.current + 1;
    memberRequestRef.current = requestId;
    setMemberLoading(true);
    setMemberError('');
    try {
      const data = await getMemberReviewState(token, productSlug);
      if (memberRequestRef.current !== requestId) return false;
      setMemberState(data);
      return true;
    } catch (error) {
      if (memberRequestRef.current !== requestId) return false;
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        handleUnauthorized();
      } else {
        setMemberError(
          error.code === 'PRODUCT_NOT_FOUND'
            ? 'Chưa thể xác định quyền đánh giá cho sản phẩm này.'
            : 'Không thể tải trạng thái đánh giá của bạn.'
        );
      }
      return false;
    } finally {
      if (memberRequestRef.current === requestId) setMemberLoading(false);
    }
  }, [handleUnauthorized, isAuthenticated, productSlug, token]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Load public Reviews for the current Product/filter/page.
    loadPublicReviews();
  }, [loadPublicReviews]);

  useEffect(() => {
    if (isInitializing) return;
    // oxlint-disable-next-line react/set-state-in-effect -- Load protected state only for an authenticated Member.
    loadMemberState();
  }, [isInitializing, loadMemberState]);

  const refreshAfterMutation = async () => {
    setReviewPage(1);
    await Promise.all([
      loadPublicReviews({ page: 1, rating: selectedRating }),
      loadMemberState(),
    ]);
  };

  const handleSubmit = async (payload) => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage('');
    const wasCreating = editorMode === 'create';

    try {
      if (wasCreating) {
        await createReview(token, productSlug, payload);
      } else if (memberState?.ownReview?.reviewId) {
        await updateReview(token, memberState.ownReview.reviewId, payload);
      }

      setEditorMode(null);
      await refreshAfterMutation();
      setActionTone('success');
      setActionMessage(wasCreating ? 'Đánh giá của bạn đã được ghi nhận.' : 'Đánh giá của bạn đã được cập nhật.');
    } catch (error) {
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        handleUnauthorized();
      } else if (error.code === 'REVIEW_ALREADY_EXISTS') {
        setEditorMode(null);
        setActionTone('warning');
        setActionMessage('Bạn đã đánh giá sản phẩm này.');
        await refreshAfterMutation();
      } else if (error.code === 'REVIEW_NOT_ELIGIBLE') {
        setEditorMode(null);
        setActionTone('warning');
        setActionMessage('Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng hoàn tất.');
        await loadMemberState();
      } else {
        setActionTone('error');
        setActionMessage('Không thể lưu đánh giá lúc này. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingFilter = (rating) => {
    setSelectedRating((current) => (current === rating ? null : rating));
    setReviewPage(1);
    setPublicError('');
  };

  const resetFilter = () => {
    setSelectedRating(null);
    setReviewPage(1);
    setPublicError('');
  };

  const summary = publicData?.summary;
  const pagination = publicData?.pagination;
  const reviews = publicData?.reviews ?? [];
  const hasReviewsOverall = (summary?.reviewCount ?? 0) > 0;

  return (
    <section
      aria-labelledby="product-reviews-title"
      className="mt-14 border-t border-[#e5e5e0] pt-9 sm:mt-18 sm:pt-11 lg:mt-24 lg:pt-14"
    >
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#991b1b]">
          Khách hàng nói gì
        </p>
        <h2
          id="product-reviews-title"
          className="mt-2 text-2xl font-black uppercase tracking-tight text-[#121212] sm:text-3xl"
        >
          Đánh giá &amp; nhận xét
        </h2>
      </header>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Rating Summary & Member Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 shadow-xs">
            {publicLoading && !publicData ? (
              <div role="status" className="animate-pulse">
                <span className="sr-only">Đang tải tổng quan đánh giá...</span>
                <div className="h-10 w-24 rounded-md bg-[#eeeeea]" />
                <div className="mt-3 h-4 w-32 rounded-md bg-[#eeeeea]" />
                <div className="mt-6 space-y-2.5">
                  {RATING_FILTERS.map((rating) => (
                    <div key={rating} className="h-5 rounded-md bg-[#eeeeea]" />
                  ))}
                </div>
              </div>
            ) : publicError && !publicData ? (
              <p className="text-sm font-bold text-[#73736e]">Chưa thể tải tổng quan đánh giá.</p>
            ) : (
              <>
                <Summary summary={summary} />
                <RatingDistribution
                  summary={summary}
                  selectedRating={selectedRating}
                  onSelect={handleRatingFilter}
                />
              </>
            )}
          </div>

          <div>
            <div aria-live="polite">
              {actionMessage && (
                <div
                  role={actionTone === 'error' ? 'alert' : 'status'}
                  className={`mb-4 rounded-lg p-3 text-xs font-semibold leading-5 ${
                    actionTone === 'success'
                      ? 'border border-[#c8e6c9] bg-[#f1f8f1] text-[#1b5e20]'
                      : 'border border-[#fecaca] bg-[#fff5f5] text-[#991b1b]'
                  }`}
                >
                  {actionMessage}
                </div>
              )}
            </div>

            <MemberReviewPanel
              isAuthenticated={isAuthenticated}
              isInitializing={isInitializing}
              memberLoading={memberLoading}
              memberError={memberError}
              memberState={memberState}
              editorMode={editorMode}
              isSubmitting={isSubmitting}
              onRetry={loadMemberState}
              onEdit={() => {
                setEditorMode('edit');
                setActionMessage('');
              }}
              onCreate={() => {
                setEditorMode('create');
                setActionMessage('');
              }}
              onCancelEditor={() => setEditorMode(null)}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Right Column: Public Review List */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 sm:p-8 shadow-xs">
            {hasReviewsOverall && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0ec] pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                    {selectedRating === null ? 'Tất cả đánh giá' : `Đánh giá ${selectedRating} sao`}
                  </p>
                  <p className="mt-0.5 text-xs text-[#73736e]">
                    {selectedRating === null
                      ? `${summary.reviewCount} nhận xét từ khách hàng`
                      : `${pagination?.totalItems ?? 0} nhận xét phù hợp`}
                  </p>
                </div>
                {selectedRating !== null && (
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="inline-flex items-center text-xs font-bold text-[#991b1b] hover:text-[#121212] transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    ✕ Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {publicLoading ? (
              <div role="status" className="py-8">
                <p className="text-xs font-semibold text-[#73736e]">Đang tải đánh giá...</p>
                <div className="mt-4 animate-pulse space-y-4">
                  <div className="h-20 rounded-lg bg-[#f1f1ed]" />
                  <div className="h-20 rounded-lg bg-[#f1f1ed]" />
                </div>
              </div>
            ) : publicError ? (
              <div className="py-8">
                <p role="alert" className="text-sm font-bold text-[#991b1b]">{publicError}</p>
                <button
                  type="button"
                  onClick={() => loadPublicReviews()}
                  className="mt-4 min-h-10 rounded-lg bg-[#121212] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#991b1b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
                >
                  Thử lại
                </button>
              </div>
            ) : selectedRating !== null && reviews.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-[#52524e]">
                  Chưa có đánh giá {selectedRating} sao.
                </p>
                <button
                  type="button"
                  onClick={resetFilter}
                  className="mt-3.5 inline-flex min-h-9 items-center rounded-lg border border-[#121212] px-4 text-xs font-bold uppercase tracking-wider text-[#121212] hover:bg-[#121212] hover:text-white transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : reviews.length > 0 ? (
              <ul className="divide-y divide-[#f0f0ec]" aria-label="Danh sách đánh giá sản phẩm">
                {reviews.map((review, index) => {
                  const { isEdited, displayDate } = getReviewDisplayDateInfo(review);
                  return (
                    <li key={`${review.createdAt}-${review.member.displayName}-${index}`} className="py-5 first:pt-4 last:pb-2">
                      <article>
                        <header className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-bold text-[#121212]">
                              {review.member.displayName}
                            </h3>
                            <span className="inline-flex items-center rounded-md bg-[#eef5ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2e7d32] border border-[#c8e6c9]">
                              ĐÃ MUA HÀNG
                            </span>
                          </div>
                          <p className="text-xs text-[#73736e]">
                            <time dateTime={displayDate}>{formatReviewDate(displayDate)}</time>
                            {isEdited && <span> · Đã chỉnh sửa</span>}
                          </p>
                        </header>
                        <div className="mt-2">
                          <ReviewRating rating={review.rating} compact />
                        </div>
                        <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#333330]">
                          {review.comment}
                        </p>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-[#73736e]">
                  Sản phẩm này chưa có nhận xét nào.
                </p>
              </div>
            )}

            {!publicError && pagination?.totalPages > 1 && (
              <nav
                aria-label="Phân trang đánh giá"
                className="mt-4 flex items-center justify-between gap-4 border-t border-[#f0f0ec] pt-4"
              >
                <button
                  type="button"
                  disabled={publicLoading || pagination.page <= 1}
                  onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                  className="min-h-9 rounded-lg border border-[#d4d4ce] bg-white px-3.5 text-xs font-bold uppercase tracking-wider text-[#121212] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:border-[#e5e5e0] disabled:text-[#a8a8a2] disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
                  aria-label="Trang đánh giá trước"
                >
                  Trước
                </button>
                <span className="text-xs font-semibold text-[#52524e]" aria-live="polite">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={publicLoading || pagination.page >= pagination.totalPages}
                  onClick={() => setReviewPage((page) => page + 1)}
                  className="min-h-9 rounded-lg border border-[#d4d4ce] bg-white px-3.5 text-xs font-bold uppercase tracking-wider text-[#121212] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:border-[#e5e5e0] disabled:text-[#a8a8a2] disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
                  aria-label="Trang đánh giá tiếp theo"
                >
                  Tiếp
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
