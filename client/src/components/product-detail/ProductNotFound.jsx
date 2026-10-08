import { Link } from 'react-router-dom';

/**
 * ProductNotFound Component
 * Displayed when user accesses an invalid product slug.
 * Clean, respectful 404 message with CTA to return to product catalog.
 */
function ProductNotFound() {
  return (
    <div className="bg-[#f8f8f6] min-h-[60vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center bg-white border border-[#e5e5e0] p-8 sm:p-10 rounded-xs shadow-xs">
        {/* Subtle Icon */}
        <div className="w-12 h-12 mx-auto mb-4 bg-[#f5f5f3] border border-[#e5e5e0] flex items-center justify-center rounded-xs text-[#737373]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#121212] mb-2">
          Không tìm thấy sản phẩm
        </h1>

        <p className="text-xs text-[#737373] leading-relaxed mb-6">
          Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đường dẫn không hợp lệ.
        </p>

        <Link
          to="/products"
          className="inline-flex items-center justify-center h-11 px-6 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-2xs"
        >
          Quay lại sản phẩm
        </Link>
      </div>
    </div>
  );
}

export default ProductNotFound;
