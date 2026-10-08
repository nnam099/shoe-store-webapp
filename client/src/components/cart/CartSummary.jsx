import { Link } from 'react-router-dom';
import { formatPrice } from '../../config/site';

/**
 * CartSummary Component
 * Displays factual order totals and cart summary without invented shipping rates
 * or disabled checkout placeholders.
 */
function CartSummary({ subtotal, totalQuantity, hasOutOfStock }) {
  return (
    <div className="bg-white border border-[#e5e5e0] p-6 rounded-xs shadow-xs space-y-5">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212] border-b border-[#e5e5e0] pb-3">
        Tóm tắt giỏ hàng
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

      {/* Out of Stock Notice */}
      {hasOutOfStock && (
        <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium rounded-xs">
          Có sản phẩm hết hàng trong giỏ. Vui lòng kiểm tra lại trước khi tiếp tục.
        </div>
      )}

      {/* Direct Shopping CTA */}
      <div className="pt-2">
        <Link
          to="/products"
          className="w-full h-11 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 shadow-2xs select-none"
        >
          <span>Tiếp tục mua sắm</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default CartSummary;
