import { useMemo } from 'react';
import { getFeaturedProducts } from '../../services/catalogService';
import ProductCard from '../catalog/ProductCard';

/**
 * Featured Products Section
 * Displays 6 curated flagship models representing all 5 brands.
 * Arranged in a 3-column desktop / 2-column mobile grid over subtle cream canvas.
 */
function FeaturedProducts() {
  const featured = useMemo(() => getFeaturedProducts(), []);

  return (
    <section id="featured" className="py-12 sm:py-16 md:py-20 border-b border-[#e5e5e0] bg-[#f8f8f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full"></span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737373]">
                TIÊU BIỂU
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#121212]">
              Bộ sưu tập nổi bật
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 md:mt-0 max-w-md">
            Những biểu tượng sneaker trường tồn, đại diện cho bản sắc thiết kế của các thương hiệu tại STEP/LAB.
          </p>
        </div>

        {/* Product Grid: 3 columns on desktop/tablet, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;
