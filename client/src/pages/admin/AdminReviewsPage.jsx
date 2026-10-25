import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminListReviews, adminDeleteReview } from '../../services/adminService';
import { formatDateTime, adminErrorMessage } from '../../utils/adminHelpers';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import AdminPagination from '../../components/admin/common/AdminPagination';
import ReviewDetailModal from '../../components/admin/reviews/ReviewDetailModal';
import ConfirmDeleteModal from '../../components/admin/common/ConfirmDeleteModal';
import { AdminToastContainer, useToasts } from '../../components/admin/common/AdminToast';

const REVIEW_SORTS = ['newest', 'oldest', 'rating-asc', 'rating-desc'];
const getReviewSort = (value) => (REVIEW_SORTS.includes(value) ? value : 'newest');

export default function AdminReviewsPage() {
  const { token } = useAdminAuth();
  const { toasts, addToast, dismissToast } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const ratingParam = searchParams.get('rating') || '';
  const sortParam = getReviewSort(searchParams.get('sort'));
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [q, setQ] = useState(queryParam);
  const [rating, setRating] = useState(ratingParam);
  const [sort, setSort] = useState(sortParam);
  const [page, setPage] = useState(pageParam);

  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setRating(searchParams.get('rating') || '');
    setSort(getReviewSort(searchParams.get('sort')));
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const updateParams = useCallback((newParams) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        next.set(k, String(v));
      } else {
        next.delete(k);
      }
    });
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminListReviews(token, {
        page,
        limit: 10,
        q: q.trim(),
        rating,
        sort,
      });
      setReviews(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      setReviews([]);
      setPagination(null);
      setError(err.message || 'Không thể tải danh sách đánh giá.');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, rating, sort]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ q, page: 1 });
  };

  const handleRatingChange = (val) => {
    setRating(val);
    updateParams({ rating: val, page: 1 });
  };

  const handleSortChange = (val) => {
    setSort(val);
    updateParams({ sort: val, page: 1 });
  };

  const handleResetFilters = () => {
    setQ('');
    setRating('');
    setSort('newest');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateParams({ page: newPage });
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!reviewToDelete || !token) return;
    setIsDeleting(true);
    try {
      await adminDeleteReview(token, reviewToDelete.reviewId);
      addToast('success', `Đã xóa đánh giá #${reviewToDelete.reviewId} thành công.`);
      setReviewToDelete(null);
      await fetchReviews();
    } catch (err) {
      addToast('error', adminErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = q || rating || sort !== 'newest';

  return (
    <AdminLayout>
      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e7eb] pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#121212]">
              Quản lý Đánh giá
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Kiểm duyệt, xem chi tiết và xóa đánh giá vi phạm từ khách hàng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchReviews}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors shadow-2xs"
            >
              <svg
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#991b1b]' : 'text-[#6b7280]'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border border-[#e5e7eb] bg-white p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm nội dung nhận xét..."
                className="w-full border border-r-0 border-[#d1d5db] px-3 py-2 text-xs placeholder-[#9ca3af] focus:border-[#121212] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#121212] px-3 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors"
              >
                Tìm
              </button>
            </form>

            {/* Rating Filter */}
            <div>
              <select
                value={rating}
                onChange={(e) => handleRatingChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Tất cả số sao</option>
                <option value="5">★★★★★ (5 sao)</option>
                <option value="4">★★★★☆ (4 sao)</option>
                <option value="3">★★★☆☆ (3 sao)</option>
                <option value="2">★★☆☆☆ (2 sao)</option>
                <option value="1">★☆☆☆☆ (1 sao)</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full border border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#374151] focus:border-[#121212] focus:outline-none"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="rating-desc">Số sao cao nhất</option>
                <option value="rating-asc">Số sao thấp nhất</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end border-t border-[#f3f4f6] pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#dc2626] hover:underline"
              >
                ✕ Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-4 border border-[#fecaca] bg-[#fef2f2] p-4 text-xs text-[#991b1b]">
            <p><span className="font-semibold">Lỗi: </span>{error}</p>
            <button type="button" onClick={fetchReviews} className="shrink-0 border border-[#991b1b] px-3 py-1.5 font-semibold hover:bg-[#991b1b] hover:text-white">
              Thử lại
            </button>
          </div>
        )}

        {/* Reviews Table */}
        {!error && <div className="border border-[#e5e7eb] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                <tr>
                  <th scope="col" className="px-4 py-3">Điểm</th>
                  <th scope="col" className="px-4 py-3">Sản phẩm</th>
                  <th scope="col" className="px-4 py-3">Khách hàng</th>
                  <th scope="col" className="px-4 py-3">Nội dung nhận xét</th>
                  <th scope="col" className="px-4 py-3">Ngày gửi</th>
                  <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6b7280]">
                      <svg className="mx-auto h-5 w-5 animate-spin text-[#991b1b]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="mt-2 text-xs">Đang tải danh sách đánh giá...</p>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#9ca3af]">
                      <svg className="mx-auto h-8 w-8 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <p className="mt-2 text-sm font-medium text-[#6b7280]">Không tìm thấy đánh giá nào</p>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.reviewId} className="hover:bg-[#f9fafb] transition-colors">
                      {/* Rating */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-[#121212]">{r.rating}</span>
                          <span className="text-[#eab308]">★</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="font-semibold text-xs text-[#121212] truncate">{r.product?.name || '—'}</p>
                        {r.product?.slug && (
                          <a
                            href={`/products/${r.product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#991b1b] hover:underline"
                          >
                            Xem sản phẩm ↗
                          </a>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="font-semibold text-xs text-[#121212] truncate">{r.customer?.fullName || '—'}</p>
                        <p className="text-[10px] text-[#6b7280] truncate">{r.customer?.email || '—'}</p>
                      </td>

                      {/* Comment */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <p className="text-xs text-[#374151] line-clamp-2 leading-relaxed">
                          {r.comment || <span className="italic text-[#9ca3af]">(Không có lời nhận xét)</span>}
                        </p>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#6b7280]">
                        {formatDateTime(r.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReview(r)}
                          className="inline-flex items-center gap-1 border border-[#d1d5db] bg-white px-2.5 py-1 text-xs font-semibold text-[#121212] hover:border-[#121212] hover:bg-[#121212] hover:text-white transition-colors"
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewToDelete(r)}
                          className="inline-flex items-center gap-1 border border-[#fecaca] bg-white px-2.5 py-1 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#dc2626] hover:text-white transition-colors"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination pagination={pagination} onPageChange={handlePageChange} />
        </div>}
      </div>

      {/* Review Detail Modal (Read-Only) */}
      <ReviewDetailModal
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
        review={selectedReview}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(reviewToDelete)}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title="Xác nhận xóa Đánh giá"
        description={`Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá #${reviewToDelete?.reviewId} của khách hàng "${reviewToDelete?.customer?.fullName || reviewToDelete?.customer?.email}" cho sản phẩm "${reviewToDelete?.product?.name}" không? Hành động này không thể hoàn tác.`}
      />
    </AdminLayout>
  );
}
