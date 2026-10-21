import { Link } from 'react-router-dom';
import { formatPrice } from '../../config/site';

/**
 * CartSummary Component
 * Displays factual order totals and cart summary without invented shipping rates
 * or disabled checkout placeholders.
 */
function CartSummary({
  subtotal,
  totalQuantity,
  hasOutOfStock = false,
  hasUnavailable = false,
  hasExceedingStock = false,
  hasUnverified = false,
  isRevalidating = false,
}) {
  const hasIssues = hasOutOfStock || hasUnavailable || hasExceedingStock;
  const canCheckout = totalQuantity > 0 && !hasIssues && !hasUnverified;

  return (
    <div className="bg-white border border-[#e5e5e0] p-6 rounded-xs shadow-xs space-y-5">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212] border-b border-[#e5e5e0] pb-3 flex items-center justify-between">
        <span>Tóm tắt giỏ hàng</span>
        {isRevalidating && (
          <span className="text-[10px] font-semibold text-[#737373] animate-pulse">
            Đang kiểm tra...
          </span>
        )}
      </h2>

      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center text-[#525252]">
          <span>Tổng số lượng:</span>
          <span className="font-extrabold text-[#121212]">{totalQuantity} sản phẩm</span>
        </div>

        <div className="flex justify-between items-baseline border-t border-[#f5f5f3] pt-3">
          <span className="text-[#525252]">Tạm tính:</span>
          <span className="text-lg font-extrabold text-[#121212] tracking-tight">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex justify-between items-center border-t border-[#f5f5f3] pt-3 text-[#737373]">
          <span>Phí vận chuyển:</span>
          <span className="italic font-medium">Xác định ở bước thanh toán</span>
        </div>
      </div>

      {/* Warnings & Notices */}
      {hasIssues && (
        <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium rounded-xs space-y-1">
          {hasOutOfStock && <p>• Có sản phẩm đã hết hàng.</p>}
          {hasUnavailable && <p>• Có sản phẩm hiện không khả dụng.</p>}
          {hasExceedingStock && <p>• Có sản phẩm vượt quá tồn kho có sẵn.</p>}
          <p className="font-bold pt-1">Vui lòng điều chỉnh hoặc xóa để tiếp tục thanh toán.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        {canCheckout ? (
          <Link
            to="/checkout"
            className="w-full h-11 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 shadow-2xs select-none"
          >
            <span>Tiến hành thanh toán</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        ) : totalQuantity > 0 ? (
          <button
            type="button"
            disabled
            className="w-full h-11 bg-[#e5e5e0] text-[#a3a3a3] text-xs font-bold uppercase tracking-wider rounded-xs cursor-not-allowed flex items-center justify-center select-none"
          >
            {hasUnverified ? 'Đang xác thực tồn kho...' : 'Cần xử lý giỏ hàng trước'}
          </button>
        ) : null}

        <Link
          to="/products"
          className="w-full h-11 border border-[#e5e5e0] hover:bg-[#f5f5f3] text-[#121212] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 select-none"
        >
          <span>Tiếp tục mua sắm</span>
        </Link>
      </div>
    </div>
  );
}

export default CartSummary;
