import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ReviewForm from '../components/product-detail/ReviewForm';
import ReviewRating from '../components/product-detail/ReviewRating';
import { getAssetUrl } from '../config/site';
import { useAuth } from '../context/authContextValue';
import { resolveReviewProductThumbnail } from '../services/catalogService';
import { getMemberReviews, updateReview } from '../services/reviewService';

const PAGE_LIMIT = 10;

function parsePage(value) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

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
  if (!Number.isFinite(createdTime) || !Number.isFinite(updatedTime)) return false;
  return updatedTime > createdTime;
}

/** Neutral placeholder shown when a product image cannot be resolved. */
function ImagePlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-[#f0f0ec]"
    >
      <svg
        className="h-6 w-6 text-[#d4d4ce]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

/** Single compact review card — handles view mode and inline edit mode. */
function ReviewCard({ review, editingId, submittingId, cardErrors, onEdit, onCancelEdit, onSubmit, thumbnailPath }) {
  const isEditing = editingId === review.reviewId;
  const isSubmitting = submittingId === review.reviewId;
  const cardError = cardErrors[review.reviewId] ?? '';

  const edited = isReviewEdited(review);
  const displayDate = edited ? review.updatedAt : review.createdAt;

  return (
    <li className="border border-[#d4d4ce] bg-white">
      <article className="p-4 sm:p-5">
        {/* Product identity row */}
        <div className="flex items-center gap-3">
          {/* Compact thumbnail */}
          <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#e5e5e0] bg-[#f5f5f3]">
            {thumbnailPath ? (
              <img
                src={getAssetUrl(thumbnailPath)}
                alt={review.product.name}
                loading="lazy"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <ImagePlaceholder />
            )}
          </div>

          {/* Name + date */}
          <div className="min-w-0 flex-1">
            <Link
              to={`/products/${encodeURIComponent(review.product.slug)}`}
              className="line-clamp-1 text-sm font-bold text-[#121212] hover:text-[#991b1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
            >
              {review.product.name}
            </Link>
            <p className="mt-0.5 text-[11px] text-[#737373]">
              <time dateTime={displayDate}>{formatReviewDate(displayDate)}</time>
              {edited && <span className="ml-1 italic">· Đã chỉnh sửa</span>}
            </p>
          </div>
        </div>

        {/* Review body / edit form */}
        {isEditing ? (
          <div className="mt-3 border-t border-[#f0f0ec] pt-3">
            {cardError && (
              <p role="alert" className="mb-3 border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#991b1b]">
                {cardError}
              </p>
            )}
            <ReviewForm
              initialReview={review}
              isSubmitting={isSubmitting}
              onCancel={() => onCancelEdit()}
              onSubmit={(payload) => onSubmit(review.reviewId, payload)}
            />
          </div>
        ) : (
          <div className="mt-3 border-t border-[#f0f0ec] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReviewRating rating={review.rating} compact />
              <button
                type="button"
                onClick={() => onEdit(review.reviewId)}
                className="inline-flex min-h-[34px] items-center border border-[#d4d4ce] bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-[#121212] hover:border-[#991b1b] hover:text-[#991b1b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991b1b]"
              >
                Sửa đánh giá
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#333330]">
              {review.comment}
            </p>
          </div>
        )}
      </article>
    </li>
  );
}

/** Black account sidebar — mirrors AccountPage sidebar exactly. */
function AccountSidebar({ member, currentPath }) {
  const navLinkClass = (path) =>
    `flex min-h-[44px] items-center text-xs font-extrabold uppercase tracking-widest underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4 ${
      currentPath === path
        ? 'text-red-300'
        : 'hover:text-red-300'
    }`;

  return (
    <aside className="border border-[#deded8] bg-[#121212] p-6 sm:p-8 text-white self-start">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Hồ sơ Member</p>
      <p className="mt-4 break-words text-lg font-bold">{member.fullName}</p>
      <p className="mt-1 break-all text-xs text-neutral-400">{member.email}</p>
      <div className="mt-7 border-t border-neutral-700 pt-6">
        <Link to="/account/orders" className={navLinkClass('/account/orders')}>
          Đơn hàng của tôi
        </Link>
        <Link to="/account/reviews" className={`mt-2 ${navLinkClass('/account/reviews')}`}>
          Đánh giá của tôi
        </Link>
        <Link to="/account/change-password" className={`mt-2 ${navLinkClass('/account/change-password')}`}>
          Đổi mật khẩu
        </Link>
        <Link
          to="/products"
          className="mt-5 flex min-h-[44px] w-full items-center justify-center border border-white bg-transparent px-4 py-3 text-center text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-[#121212] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    </aside>
  );
}

export default function MemberReviewsPage() {
  const { token, member, clearSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = searchParams.get('page');
  const page = useMemo(() => parsePage(rawPage), [rawPage]);

  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});

  // Asynchronous thumbnail cache state
  const [thumbnails, setThumbnails] = useState({});

  const activeRef = useRef(true);

  // Resolve product thumbnails asynchronously when reviews change
  useEffect(() => {
    if (!reviews || reviews.length === 0) return;
    const slugs = [...new Set(reviews.map((r) => r.product?.slug).filter(Boolean))];
    let isCurrent = true;

    Promise.allSettled(
      slugs.map(async (slug) => {
        const thumb = await resolveReviewProductThumbnail(slug);
        return { slug, thumb };
      })
    ).then((results) => {
      if (!isCurrent) return;
      const map = {};
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          map[res.value.slug] = res.value.thumb;
        }
      }
      setThumbnails((prev) => ({ ...prev, ...map }));
    });

    return () => {
      isCurrent = false;
    };
  }, [reviews]);

  // Normalise invalid page query param
  useEffect(() => {
    if (rawPage !== null && String(page) !== rawPage) {
      setSearchParams({ page: '1' }, { replace: true });
    }
  }, [page, rawPage, setSearchParams]);

  useEffect(() => {
    activeRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect -- Begin loading on page/retry change.
    setLoading(true);
    setErrorMessage('');
    setEditingId(null);
    setCardErrors({});

    getMemberReviews(token, { page, limit: PAGE_LIMIT })
      .then((data) => {
        if (!activeRef.current) return;

        const nextPagination = data?.pagination || {};
        if (nextPagination.totalPages > 0 && page > nextPagination.totalPages) {
          setSearchParams(
            { page: String(nextPagination.totalPages) },
            { replace: true }
          );
          return;
        }

        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setPagination({
          page: nextPagination.page || page,
          limit: nextPagination.limit || PAGE_LIMIT,
          totalItems: nextPagination.totalItems || 0,
          totalPages: nextPagination.totalPages || 0,
        });
      })
      .catch((error) => {
        if (!activeRef.current) return;
        if (error.status === 401 && error.code === 'UNAUTHORIZED') {
          const intendedRoute = `${location.pathname}${location.search}`;
          clearSession();
          navigate('/login', {
            replace: true,
            state: {
              from: intendedRoute,
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            },
          });
          return;
        }
        setErrorMessage('Không thể tải đánh giá lúc này. Vui lòng thử lại.');
      })
      .finally(() => {
        if (activeRef.current) setLoading(false);
      });

    return () => {
      activeRef.current = false;
    };
  }, [clearSession, location.pathname, location.search, navigate, page, retryKey, setSearchParams, token]);

  const changePage = (nextPage) => {
    if (nextPage < 1 || (pagination.totalPages > 0 && nextPage > pagination.totalPages)) return;
    setSearchParams({ page: String(nextPage) });
  };

  const handleEdit = (reviewId) => {
    setEditingId(reviewId);
    setCardErrors((current) => ({ ...current, [reviewId]: '' }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSubmit = async (reviewId, payload) => {
    if (submittingId !== null) return;
    setSubmittingId(reviewId);
    setCardErrors((current) => ({ ...current, [reviewId]: '' }));

    try {
      const updated = await updateReview(token, reviewId, payload);
      if (!activeRef.current) return;

      setReviews((current) =>
        current.map((r) =>
          r.reviewId === reviewId
            ? {
                ...r,
                rating: updated.rating ?? r.rating,
                comment: updated.comment ?? r.comment,
                createdAt: updated.createdAt ?? r.createdAt,
                updatedAt: updated.updatedAt ?? r.updatedAt,
              }
            : r
        )
      );
      setEditingId(null);
    } catch (error) {
      if (!activeRef.current) return;
      if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        const intendedRoute = `${location.pathname}${location.search}`;
        clearSession();
        navigate('/login', {
          replace: true,
          state: {
            from: intendedRoute,
            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          },
        });
        return;
      }
      setCardErrors((current) => ({
        ...current,
        [reviewId]: 'Không thể lưu đánh giá lúc này. Vui lòng thử lại.',
      }));
    } finally {
      if (activeRef.current) setSubmittingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      {/* Page header */}
      <div className="border-b border-[#d4d4ce] pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#991b1b]">
          Member account
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight">
          Đánh giá của tôi
        </h1>
      </div>

      {/* Two-column layout: sidebar + content */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)] gap-6 lg:gap-10">
        {/* Sidebar */}
        <AccountSidebar member={member} currentPath={location.pathname} />

        {/* Main content */}
        <section>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex items-center gap-2 text-xs text-[#737373]">
              <li><Link to="/account" className="hover:text-[#121212]">Tài khoản</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-bold text-[#121212]" aria-current="page">Đánh giá của tôi</li>
            </ol>
          </nav>

          <div className="border border-[#deded8] bg-white p-6 sm:p-8 lg:p-10">
            <h2 className="text-xl font-black uppercase tracking-tight">Đánh giá sản phẩm</h2>
            <p className="mt-2 text-xs leading-5 text-[#737373]">
              Xem và chỉnh sửa các đánh giá sản phẩm bạn đã gửi.
            </p>

            <div className="mt-6">
              {loading ? (
                <div role="status" className="space-y-3" aria-label="Đang tải đánh giá">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-28 animate-pulse border border-[#e5e5e0] bg-[#f8f8f6]" />
                  ))}
                </div>
              ) : errorMessage ? (
                <div className="border border-[#fecaca] bg-[#fef2f2] p-5">
                  <p role="alert" className="text-sm font-bold text-[#991b1b]">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => setRetryKey((value) => value + 1)}
                    className="mt-4 min-h-[44px] bg-[#121212] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
                  >
                    Thử lại
                  </button>
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-base font-black uppercase tracking-tight text-[#121212]">
                    Bạn chưa có đánh giá nào.
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#737373]">
                    Mua sắm và đánh giá sản phẩm để chia sẻ cảm nhận của bạn.
                  </p>
                  <Link
                    to="/products"
                    className="mt-5 inline-flex min-h-[44px] items-center justify-center bg-[#121212] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#991b1b]"
                  >
                    Khám phá sản phẩm
                  </Link>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-xs text-[#737373]">{pagination.totalItems} đánh giá</p>
                  <ol className="space-y-3">
                    {reviews.map((review) => (
                      <ReviewCard
                        key={review.reviewId}
                        review={review}
                        editingId={editingId}
                        submittingId={submittingId}
                        cardErrors={cardErrors}
                        onEdit={handleEdit}
                        onCancelEdit={handleCancelEdit}
                        onSubmit={handleSubmit}
                        thumbnailPath={thumbnails[review.product.slug] ?? null}
                      />
                    ))}
                  </ol>

                  {pagination.totalPages > 1 && (
                    <nav aria-label="Phân trang đánh giá" className="mt-7 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => changePage(page - 1)}
                        disabled={page <= 1}
                        className="min-h-[44px] border border-[#d4d4ce] px-4 text-xs font-bold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Trước
                      </button>
                      <span className="min-w-20 text-center text-xs font-bold" aria-current="page">
                        {page} / {pagination.totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => changePage(page + 1)}
                        disabled={page >= pagination.totalPages}
                        className="min-h-[44px] border border-[#d4d4ce] px-4 text-xs font-bold uppercase tracking-wider hover:border-[#121212] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Tiếp
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
