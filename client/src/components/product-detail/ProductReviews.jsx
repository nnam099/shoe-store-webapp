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
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function wasMeaningfullyEdited(review) {
  const createdAt = Date.parse(review.createdAt);
  const updatedAt = Date.parse(review.updatedAt);
  return Number.isFinite(createdAt)
    && Number.isFinite(updatedAt)
    && updatedAt - createdAt >= 60_000;
}

function Summary({ summary }) {
  if (!summary || summary.reviewCount === 0) {
    return (
      <div className="max-w-sm py-1">
        <p className="text-xl font-black uppercase tracking-tight text-[#121212]">
          Chưa có đánh giá
        </p>
        <p className="mt-3 text-sm leading-6 text-[#62625d]">
          Hãy là người đầu tiên chia sẻ trải nghiệm về sản phẩm.
        </p>
      </div>
    );
  }

  const average = Number(summary.averageRating);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black leading-none tracking-[-0.05em] text-[#121212]">
          {average.toFixed(1)}
        </span>
        <span className="text-sm font-bold text-[#73736e]">/ 5</span>
      </div>
      <div className="mt-4">
        <ReviewRating rating={average} />
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#52524e]">
        {summary.reviewCount} đánh giá
      </p>
    </div>
  );
}

function RatingDistribution({ summary, selectedRating, onSelect }) {
  if (!summary || summary.reviewCount === 0) return null;

  return (
    <div className="mt-7 border-t border-[#d4d4ce] pt-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]">
        Phân bố đánh giá
      </p>
      <div className="mt-4 border-y border-[#deded8]">
        {RATING_FILTERS.map((rating) => {
          const count = summary.distribution?.[rating] ?? 0;
          const percentage = summary.reviewCount > 0
            ? (count / summary.reviewCount) * 100
            : 0;
          const active = selectedRating === rating;

          return (
            <div key={rating} className="border-b border-[#ecece7] last:border-b-0">
              <button
                type="button"
                aria-label={`Lọc đánh giá ${rating} sao, ${count} đánh giá`}
                aria-pressed={active}
                onClick={() => onSelect(rating)}
                className={`group relative flex min-h-12 w-full items-center gap-3 border-0 px-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] ${
                  active
                    ? 'bg-[#fff5f5]'
                    : 'bg-white hover:bg-[#fafaf8]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-2 left-0 w-0.5 transition-colors ${
                    active ? 'bg-[#991b1b]' : 'bg-transparent group-hover:bg-[#d9a3a3]'
                  }`}
                />
                <span className={`w-9 shrink-0 text-xs font-black ${active ? 'text-[#991b1b]' : 'text-[#292927]'}`}>
                  {rating}★
                </span>
                <span
                  role="progressbar"
                  aria-label={`${percentage.toFixed(0)} phần trăm đánh giá ${rating} sao`}
                  aria-valuemin="0"
                  aria-valuemax={summary.reviewCount}
                  aria-valuenow={count}
                  className="h-1.5 min-w-0 flex-1 overflow-hidden bg-[#e6e6e0]"
                >
                  <span
                    className={`block h-full transition-[width] duration-300 ${
                      active ? 'bg-[#7f1d1d]' : 'bg-[#991b1b]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </span>
                <span className={`w-6 shrink-0 text-right text-xs font-bold ${active ? 'text-[#991b1b]' : 'text-[#73736e]'}`}>
                  {count}
                </span>
              </button>
            </div>
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
      <p role="status" className="text-xs font-semibold text-[#73736e]">
        Đang tải trạng thái đánh giá...
      </p>
    );
  }

  if (memberError) {
    return (
      <div>
        <p role="alert" className="text-xs font-semibold leading-5 text-[#991b1b]">
          {memberError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-11 border border-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider hover:bg-[#121212] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h3 className="text-sm font-black uppercase tracking-wide">Chia sẻ trải nghiệm của bạn</h3>
        <p className="mt-2 text-xs leading-5 text-[#52524e]">
          Đăng nhập và hoàn tất đơn hàng có sản phẩm này để có thể đánh giá.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex min-h-11 items-center bg-[#121212] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (memberState?.ownReview) {
    const ownReview = memberState.ownReview;
    return (
      <div>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide">Đánh giá của bạn</h3>
            <div className="mt-3"><ReviewRating rating={ownReview.rating} /></div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#333330]">
              {ownReview.comment}
            </p>
            <p className="mt-3 text-[11px] text-[#73736e]">
              {wasMeaningfullyEdited(ownReview) ? 'Đã chỉnh sửa' : 'Đã đăng'} ·{' '}
              <time dateTime={ownReview.updatedAt}>{formatReviewDate(ownReview.updatedAt)}</time>
            </p>
          </div>
          {editorMode !== 'edit' && (
            <button
              type="button"
              onClick={onEdit}
              className="min-h-11 w-full border border-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider hover:border-[#991b1b] hover:bg-[#991b1b] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
            >
              Chỉnh sửa đánh giá
            </button>
          )}
        </div>
        {editorMode === 'edit' && (
          <div className="mt-6">
            <ReviewForm
              initialReview={ownReview}
              isSubmitting={isSubmitting}
              onCancel={onCancelEditor}
              onSubmit={onSubmit}
            />
          </div>
        )}
      </div>
    );
  }

  if (memberState?.eligible) {
    return (
      <div>
        <h3 className="text-sm font-black uppercase tracking-wide">Sản phẩm đã đồng hành cùng bạn?</h3>
        <p className="mt-2 text-xs leading-5 text-[#52524e]">
          Chia sẻ đánh giá để giúp cộng đồng STEP/LAB lựa chọn dễ dàng hơn.
        </p>
        {editorMode === 'create' ? (
          <div className="mt-6">
            <ReviewForm
              isSubmitting={isSubmitting}
              onCancel={onCancelEditor}
              onSubmit={onSubmit}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 min-h-11 w-full bg-[#991b1b] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#7f1d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
          >
            Viết đánh giá
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide">Đánh giá từ đơn hàng hoàn tất</h3>
      <p className="mt-2 text-xs leading-5 text-[#52524e]">
        Bạn có thể đánh giá sản phẩm sau khi đơn hàng hoàn tất.
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
      className="mt-14 border-t border-[#bfbfb8] pt-9 sm:mt-18 sm:pt-11 lg:mt-24 lg:pt-14"
    >
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#991b1b]">
          Khách hàng nói gì
        </p>
        <h2
          id="product-reviews-title"
          className="mt-2 text-2xl font-black uppercase tracking-[-0.025em] text-[#121212] sm:text-3xl"
        >
          Đánh giá &amp; nhận xét
        </h2>
      </header>

      <div className="mt-7 border-y border-[#bfbfb8] bg-white lg:flex">
        <aside className="border-b border-[#bfbfb8] p-5 sm:p-7 lg:w-1/3 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-8 xl:p-9">
          {publicLoading && !publicData ? (
            <div role="status" className="animate-pulse">
              <span className="sr-only">Đang tải tổng quan đánh giá...</span>
              <div className="h-11 w-28 bg-[#eeeeea]" />
              <div className="mt-4 h-4 w-36 bg-[#eeeeea]" />
              <div className="mt-8 space-y-3">
                {RATING_FILTERS.map((rating) => <div key={rating} className="h-5 bg-[#eeeeea]" />)}
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

          <div className="mt-8 border-t border-[#deded8] pt-7">
            <div aria-live="polite">
              {actionMessage && (
                <p
                  role={actionTone === 'error' ? 'alert' : 'status'}
                  className={`mb-6 border p-3 text-xs font-bold leading-5 ${
                    actionTone === 'success'
                      ? 'border-[#121212] bg-white text-[#121212]'
                      : 'border-[#991b1b] bg-[#fff5f5] text-[#7f1d1d]'
                  }`}
                >
                  {actionMessage}
                </p>
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
        </aside>

        <div className="min-w-0 p-5 sm:p-7 lg:flex-1 lg:p-8 xl:p-10">
          {hasReviewsOverall && (
            <div className="flex min-h-11 flex-col gap-3 border-b border-[#bfbfb8] pb-5 sm:flex-row sm:items-center sm:justify-between">
              {selectedRating === null ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]">
                    Tất cả đánh giá
                  </p>
                  <p className="mt-1 text-xs text-[#73736e]">{summary.reviewCount} đánh giá</p>
                </div>
              ) : (
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#991b1b]" aria-live="polite">
                  Đang xem: {selectedRating} sao · {pagination?.totalItems ?? 0} đánh giá
                </p>
              )}
              {selectedRating !== null && (
                <button
                  type="button"
                  onClick={resetFilter}
                  className="min-h-11 self-start border-b border-[#991b1b] text-[10px] font-black uppercase tracking-[0.16em] text-[#991b1b] hover:border-[#121212] hover:text-[#121212] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] sm:self-auto"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          {publicLoading ? (
            <div role="status" className="py-10">
              <p className="text-xs font-semibold text-[#73736e]">Đang tải đánh giá...</p>
              <div className="mt-5 animate-pulse space-y-5">
                <div className="h-20 bg-[#f1f1ed]" />
                <div className="h-20 bg-[#f1f1ed]" />
              </div>
            </div>
          ) : publicError ? (
            <div className="py-10">
              <p role="alert" className="text-sm font-bold text-[#991b1b]">{publicError}</p>
              <button
                type="button"
                onClick={() => loadPublicReviews()}
                className="mt-5 min-h-11 bg-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              >
                Thử lại
              </button>
            </div>
          ) : selectedRating !== null && reviews.length === 0 ? (
            <div className="border-b border-[#d4d4ce] py-10">
              <p className="text-sm font-bold text-[#292927]">
                Chưa có đánh giá {selectedRating} sao.
              </p>
              <button
                type="button"
                onClick={resetFilter}
                className="mt-5 min-h-11 border border-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider hover:bg-[#121212] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : reviews.length > 0 ? (
            <ul className="divide-y divide-[#d4d4ce]" aria-label="Danh sách đánh giá sản phẩm">
              {reviews.map((review, index) => (
                <li key={`${review.createdAt}-${review.member.displayName}-${index}`}>
                  <article className="py-7 sm:py-8">
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                      <h3 className="text-sm font-black text-[#121212]">{review.member.displayName}</h3>
                      <p className="shrink-0 text-[11px] text-[#73736e]">
                        <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
                        {wasMeaningfullyEdited(review) && <span> · Đã chỉnh sửa</span>}
                      </p>
                    </header>
                    <div className="mt-3"><ReviewRating rating={review.rating} compact /></div>
                    <p className="mt-4 max-w-[68ch] whitespace-pre-wrap break-words text-sm leading-6 text-[#333330]">
                      {review.comment}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          ) : null}

          {!publicError && pagination?.totalPages > 1 && (
            <nav
              aria-label="Phân trang đánh giá"
              className="mt-2 flex items-center justify-between gap-4 border-t border-[#bfbfb8] pt-6"
            >
              <button
                type="button"
                disabled={publicLoading || pagination.page <= 1}
                onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                className="min-h-11 border border-[#121212] px-4 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-[#121212] hover:text-white disabled:cursor-not-allowed disabled:border-[#d4d4ce] disabled:text-[#9b9b95] disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] sm:px-5"
                aria-label="Trang đánh giá trước"
              >
                Trước
              </button>
              <span className="text-xs font-bold text-[#52524e]" aria-live="polite">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={publicLoading || pagination.page >= pagination.totalPages}
                onClick={() => setReviewPage((page) => page + 1)}
                className="min-h-11 border border-[#121212] px-4 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-[#121212] hover:text-white disabled:cursor-not-allowed disabled:border-[#d4d4ce] disabled:text-[#9b9b95] disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b] sm:px-5"
                aria-label="Trang đánh giá tiếp theo"
              >
                Tiếp
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
