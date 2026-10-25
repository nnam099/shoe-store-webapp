import { Link } from 'react-router-dom';
import { formatDateTime } from '../../../utils/adminHelpers';

export default function ReviewDetailModal({ isOpen, onClose, review }) {
  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg border border-[#2a2a2a] bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#f3f4f6] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#121212]">Chi tiết Đánh giá</h3>
            <p className="font-mono text-xs text-[#6b7280] mt-0.5">
              Mã đánh giá: #{review.reviewId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#121212] transition-colors p-1"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs">
          {/* Product Info */}
          <div className="rounded-xs border border-[#e5e7eb] bg-[#f9fafb] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Sản phẩm</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-sm text-[#121212]">{review.product?.name || '—'}</span>
              {review.product?.slug && (
                <a
                  href={`/products/${review.product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#991b1b] hover:underline"
                >
                  Xem tại Storefront
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-xs border border-[#e5e7eb] bg-[#f9fafb] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Khách hàng</span>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#121212]">{review.customer?.fullName || '—'}</p>
                <p className="text-[#6b7280]">{review.customer?.email || '—'}</p>
              </div>
              {review.customer?.id && (
                <Link
                  to={`/admin/customers/${review.customer.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#121212] underline hover:text-[#991b1b]"
                >
                  Hồ sơ khách hàng
                </Link>
              )}
            </div>
          </div>

          {/* Rating & Comment */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Điểm đánh giá:</span>
              <div className="flex items-center text-[#eab308]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-4 w-4 ${star <= review.rating ? 'fill-current' : 'fill-none stroke-current stroke-1 text-[#d1d5db]'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="font-bold text-[#121212] ml-1">{review.rating} / 5</span>
            </div>

            <div className="rounded-xs border border-[#e5e7eb] bg-white p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] mb-1.5">Nội dung nhận xét</p>
              <p className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">
                {review.comment || '(Không có nội dung nhận xét)'}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 border-t border-[#f3f4f6] pt-3 text-[11px] text-[#6b7280]">
            <div>
              <span>Ngày gửi: </span>
              <span className="font-medium text-[#121212]">{formatDateTime(review.createdAt)}</span>
            </div>
            <div>
              <span>Cập nhật: </span>
              <span className="font-medium text-[#121212]">{formatDateTime(review.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-[#f3f4f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
