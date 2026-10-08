import { Link } from 'react-router-dom';

/**
 * EmptyCart Component
 * Renders neutral, elegant empty state when there are no items in cart.
 */
function EmptyCart() {
  return (
    <div className="bg-white border border-[#e5e5e0] p-8 sm:p-14 text-center rounded-xs shadow-xs max-w-lg mx-auto">
      {/* Shopping Bag Icon */}
      <div className="w-16 h-16 mx-auto mb-5 bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs flex items-center justify-center text-[#737373]">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#121212] mb-2.5">
        Giỏ hàng của bạn đang trống
      </h2>

      <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-8 max-w-sm mx-auto">
        Khám phá các sản phẩm tại STEP/LAB và chọn đôi giày phù hợp với bạn.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/products"
          className="w-full sm:w-auto h-11 px-6 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center shadow-2xs"
        >
          Khám phá sản phẩm
        </Link>
        <Link
          to="/"
          className="w-full sm:w-auto h-11 px-6 bg-white hover:bg-[#f5f5f3] text-[#121212] border border-[#e5e5e0] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

export default EmptyCart;
