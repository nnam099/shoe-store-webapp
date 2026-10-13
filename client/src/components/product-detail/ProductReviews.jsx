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
      <div>
        <p className="text-2xl font-black uppercase tracking-tight text-[#121212]">Chưa có đánh giá</p>
        <p className="mt-2 text-xs leading-5 text-[#737373]">
          Hãy là người đầu tiên chia sẻ trải nghiệm về sản phẩm.
        </p>
      </div>
    );
  }

  const average = Number(summary.averageRating);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl font-black tracking-tight text-[#121212]">
          {average.toFixed(1)}
        </span>
        <span className="text-sm font-bold text-[#737373]">/ 5</span>
      </div>
      <div className="mt-3">
        <ReviewRating rating={average} />
      </div>
      <p className="mt-3 text-xs font-bold text-[#525252]">
        {summary.reviewCount} đánh giá
      </p>
    </div>
  );
}

export default function ProductReviews({ productSlug }) {
  const { token, isAuthenticated, isInitializing, clearSession } = useAuth();
  const [reviewPage, setReviewPage] = useState(1);
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

  const loadPublicReviews = useCallback(async ({ page = reviewPage } = {}) => {
    const requestId = publicRequestRef.current + 1;
    publicRequestRef.current = requestId;
    setPublicLoading(true);
    setPublicError('');
    try {
      const data = await getProductReviews(productSlug, { page, limit: REVIEWS_PER_PAGE });
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
  }, [productSlug, reviewPage]);

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
    // oxlint-disable-next-line react/set-state-in-effect -- Load public Reviews for the current Product/page.
    loadPublicReviews();
  }, [loadPublicReviews]);

  useEffect(() => {
    if (isInitializing) return;
    // oxlint-disable-next-line react/set-state-in-effect -- Load protected state only for an authenticated Member.
    loadMemberState();
  }, [isInitializing, loadMemberState]);

  const refreshAfterMutation = async ({ resetPage = false } = {}) => {
    const nextPage = resetPage ? 1 : reviewPage;
    if (resetPage) setReviewPage(1);
    await Promise.all([
      loadPublicReviews({ page: nextPage }),
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
      await refreshAfterMutation({ resetPage: wasCreating });
      setActionTone('success');
      setActionMessage(wasCreating ? 'Đánh giá của bạn đã được ghi nhận.' : 'Đánh giá của bạn đã được cập nhật.');
    } catch (error) {
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        handleUnauthorized();
      } else if (error.code === 'REVIEW_ALREADY_EXISTS') {
        setEditorMode(null);
        setActionTone('warning');
        setActionMessage('Bạn đã đánh giá sản phẩm này.');
        await refreshAfterMutation({ resetPage: true });
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

  const pagination = publicData?.pagination;
  const reviews = publicData?.reviews ?? [];

  return (
    <section aria-labelledby="product-reviews-title" className="mt-14 border-t border-[#cfcfc8] pt-8 sm:mt-18 sm:pt-10 lg:mt-24 lg:pt-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#991b1b]">
            Member voices
          </p>
          <h2 id="product-reviews-title" className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Đánh giá sản phẩm
          </h2>
        </div>
        {publicData?.summary?.reviewCount > 0 && (
          <p className="text-xs font-bold text-[#737373]">
            Ý kiến từ khách hàng đã mua sản phẩm
          </p>
        )}
      </div>

      <div className="mt-7 grid border-y border-[#d4d4ce] lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-[#d4d4ce] bg-white p-5 sm:p-7 lg:border-r lg:border-b-0 lg:p-8">
          {publicLoading && !publicData ? (
            <div role="status" className="animate-pulse">
              <span className="sr-only">Đang tải tổng quan đánh giá...</span>
              <div className="h-9 w-28 bg-[#eeeeea]" />
              <div className="mt-4 h-4 w-36 bg-[#eeeeea]" />
            </div>
          ) : publicError && !publicData ? (
            <p className="text-sm font-bold text-[#737373]">Chưa thể tải tổng quan đánh giá.</p>
          ) : (
            <Summary summary={publicData?.summary} />
          )}
        </div>

        <div className="bg-[#f3f3f0] p-5 sm:p-7 lg:p-8">
          <div aria-live="polite">
            {actionMessage && (
              <p
                role={actionTone === 'error' ? 'alert' : 'status'}
                className={`mb-5 border p-3 text-xs font-bold ${
                  actionTone === 'success'
                    ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]'
                    : actionTone === 'warning'
                      ? 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]'
                      : 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]'
                }`}
              >
                {actionMessage}
              </p>
            )}
          </div>

          {isInitializing || memberLoading ? (
            <p role="status" className="text-xs font-semibold text-[#737373]">Đang tải trạng thái đánh giá...</p>
          ) : memberError ? (
            <div>
              <p role="alert" className="text-xs font-semibold text-[#991b1b]">{memberError}</p>
              <button
                type="button"
                onClick={loadMemberState}
                className="mt-4 min-h-11 border border-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider hover:bg-[#121212] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              >
                Thử lại
              </button>
            </div>
          ) : !isAuthenticated ? (
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Chia sẻ trải nghiệm của bạn</h3>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[#525252]">
                Đăng nhập và hoàn tất đơn hàng có sản phẩm này để có thể đánh giá.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex min-h-11 items-center bg-[#121212] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              >
                Đăng nhập
              </Link>
            </div>
          ) : memberState?.ownReview ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Đánh giá của bạn</h3>
                  <div className="mt-3"><ReviewRating rating={memberState.ownReview.rating} /></div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#404040]">
                    {memberState.ownReview.comment}
                  </p>
                </div>
                {editorMode !== 'edit' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode('edit');
                      setActionMessage('');
                    }}
                    className="min-h-11 shrink-0 border border-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider hover:bg-[#121212] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
                  >
                    Chỉnh sửa đánh giá
                  </button>
                )}
              </div>
              {editorMode === 'edit' && (
                <div className="mt-5">
                  <ReviewForm
                    initialReview={memberState.ownReview}
                    isSubmitting={isSubmitting}
                    onCancel={() => setEditorMode(null)}
                    onSubmit={handleSubmit}
                  />
                </div>
              )}
            </div>
          ) : memberState?.eligible ? (
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Sản phẩm đã đồng hành cùng bạn?</h3>
              <p className="mt-2 text-xs leading-5 text-[#525252]">Chia sẻ đánh giá để giúp cộng đồng STEP/LAB lựa chọn dễ dàng hơn.</p>
              {editorMode === 'create' ? (
                <div className="mt-5">
                  <ReviewForm
                    isSubmitting={isSubmitting}
                    onCancel={() => setEditorMode(null)}
                    onSubmit={handleSubmit}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditorMode('create');
                    setActionMessage('');
                  }}
                  className="mt-5 min-h-11 bg-[#121212] px-6 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
                >
                  Viết đánh giá
                </button>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Đánh giá từ đơn hàng hoàn tất</h3>
              <p className="mt-2 text-xs leading-5 text-[#525252]">
                Bạn có thể đánh giá sản phẩm sau khi đơn hàng hoàn tất.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        {publicLoading && publicData ? (
          <p role="status" className="border-y border-[#e5e5e0] py-6 text-xs font-semibold text-[#737373]">
            Đang cập nhật đánh giá...
          </p>
        ) : publicError ? (
          <div className="border border-[#fecaca] bg-white p-5 sm:p-6">
            <p role="alert" className="text-sm font-bold text-[#991b1b]">{publicError}</p>
            <button
              type="button"
              onClick={() => loadPublicReviews()}
              className="mt-4 min-h-11 bg-[#121212] px-5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
            >
              Thử lại
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <p className="border-y border-[#e5e5e0] py-8 text-sm text-[#737373]">
            Chưa có đánh giá nào cho sản phẩm này.
          </p>
        ) : (
          <ul className="divide-y divide-[#d4d4ce] border-y border-[#d4d4ce]" aria-label="Danh sách đánh giá sản phẩm">
            {reviews.map((review, index) => (
              <li key={`${review.createdAt}-${review.member.displayName}-${index}`}>
                <article className="grid gap-4 py-6 sm:grid-cols-[minmax(150px,0.35fr)_minmax(0,1fr)] sm:py-7">
                  <header>
                    <h3 className="text-sm font-black text-[#121212]">{review.member.displayName}</h3>
                    <p className="mt-2 text-[11px] text-[#737373]">
                      <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
                      {wasMeaningfullyEdited(review) && <span> · Đã chỉnh sửa</span>}
                    </p>
                  </header>
                  <div>
                    <ReviewRating rating={review.rating} compact />
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#404040]">
                      {review.comment}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        {!publicError && pagination?.totalPages > 1 && (
          <nav aria-label="Phân trang đánh giá" className="mt-6 flex items-center justify-between gap-4 border-t border-[#e5e5e0] pt-5">
            <button
              type="button"
              disabled={publicLoading || pagination.page <= 1}
              onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
              className="min-h-11 border border-[#d4d4ce] px-5 text-xs font-extrabold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              aria-label="Trang đánh giá trước"
            >
              Trước
            </button>
            <span className="text-xs font-bold text-[#525252]" aria-live="polite">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={publicLoading || pagination.page >= pagination.totalPages}
              onClick={() => setReviewPage((page) => page + 1)}
              className="min-h-11 border border-[#d4d4ce] px-5 text-xs font-extrabold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              aria-label="Trang đánh giá tiếp theo"
            >
              Tiếp
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
