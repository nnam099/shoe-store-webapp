import ProductCard from '../catalog/ProductCard';

/**
 * New Arrivals Section
 * Displays top 8 recently cataloged products in a 4-column desktop / 2-column mobile grid.
 */
function NewArrivals({ products = [], isLoading = false, error = null }) {
  const items = Array.isArray(products) ? products : [];
  if (!isLoading && items.length === 0 && !error) return null;

  return (
    <section id="new-arrivals" className="py-12 sm:py-16 md:py-20 border-b border-[#e5e5e0] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full"></span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737373]">
                VỪA CẬP NHẬT
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#121212]">
              Sản phẩm mới về
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 md:mt-0 max-w-md">
            Những thiết kế sneaker mới vừa được bổ sung vào danh mục STEP/LAB.
          </p>
        </div>

        {/* Product Grid / Skeletons / Error */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border border-[#e5e5e0] bg-white p-3 sm:p-4 rounded-xs animate-pulse">
                <div className="aspect-square bg-[#f0f0ed] mb-3" />
                <div className="h-3 w-16 bg-[#e5e5e0] mb-2" />
                <div className="h-4 w-32 bg-[#e5e5e0] mb-3" />
                <div className="h-4 w-20 bg-[#e5e5e0]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#737373] bg-[#f8f8f6] border border-[#e5e5e0] rounded-xs">
            Không thể tải danh sách sản phẩm mới. Vui lòng tải lại trang.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {items.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default NewArrivals;
