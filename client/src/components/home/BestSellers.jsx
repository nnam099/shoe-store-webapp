import { Link } from 'react-router-dom';
import ProductCard from '../catalog/ProductCard';

/**
 * BestSellers Section
 * Displays top 5 best selling sneaker models based on real completed orders.
 * Fetches from public /api/catalog/best-sellers endpoint.
 * Gracefully hides if empty or on error.
 */
function BestSellers({ products = [], _isLoading = false, error = null }) {
  if (error) return null;
  const items = Array.isArray(products) ? products.slice(0, 5) : [];
  if (items.length === 0) return null;

  return (
    <section id="best-sellers" className="py-12 sm:py-16 md:py-20 border-b border-[#e5e5e0] bg-[#f8f8f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full"></span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737373]">
                BÁN CHẠY NHẤT
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#121212]">
              TOP 5 GIÀY BÁN CHẠY NHẤT
            </h2>
            <p className="text-xs sm:text-sm text-[#737373] mt-2 max-w-md">
              Những mẫu giày được khách hàng lựa chọn nhiều nhất tại STEP/LAB.
            </p>
          </div>
          <div>
            <Link
              to="/products"
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#991b1b] hover:text-[#7f1d1d] transition-colors inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#991b1b]"
            >
              Xem tất cả sản phẩm
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Product Grid: up to 5 cards per row on desktop, 2 on mobile */}
        <div
          className={`grid grid-cols-2 ${
            items.length <= 3
              ? 'sm:grid-cols-3 lg:grid-cols-3'
              : items.length === 4
              ? 'sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4'
              : 'sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          } gap-3 sm:gap-4 md:gap-6`}
        >
          {items.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
              rank={product.rank}
              quantitySold={product.quantitySold}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default BestSellers;
