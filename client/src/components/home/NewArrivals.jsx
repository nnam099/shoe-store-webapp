import { useMemo } from 'react';
import { getNewArrivals } from '../../services/catalogService';
import ProductCard from '../catalog/ProductCard';

/**
 * New Arrivals Section
 * Displays top 8 recently cataloged products in a 4-column desktop / 2-column mobile grid.
 */
function NewArrivals() {
  const newArrivals = useMemo(() => getNewArrivals(8), []);

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
            Những thiết kế sneaker mới nhất vừa được bổ sung vào danh mục phân phối chính hãng STEP/LAB.
          </p>
        </div>

        {/* Product Grid: 4 columns on desktop, 3 on tablet, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default NewArrivals;
