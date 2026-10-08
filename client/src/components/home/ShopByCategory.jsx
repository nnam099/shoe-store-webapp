import { useMemo } from 'react';
import { getCategories } from '../../services/catalogService';
import { getAssetUrl } from '../../config/site';

/**
 * Shop By Category Section
 * Features 4 curated categories with model counts derived dynamically from the catalog.
 * Visual presentation adheres to STEP/LAB minimal editorial look with representative silhouettes.
 */
function ShopByCategory() {
  const categories = useMemo(() => getCategories(), []);

  return (
    <section id="categories" className="py-8 sm:py-14 md:py-20 border-b border-[#e5e5e0] bg-[#f8f8f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8 md:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5 sm:mb-2">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full"></span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737373]">
                DANH MỤC TUYỂN CHỌN
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#121212]">
              Khám phá theo danh mục
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#737373] mt-1 sm:mt-2 md:mt-0 max-w-md">
            Lựa chọn thiết kế phù hợp với phong cách sống, gu thẩm mỹ và mục đích vận động hàng ngày.
          </p>
        </div>

        {/* 4 Category Cards: 2 columns on mobile (2x2), 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {categories.map((category) => (
            <div
              key={category.slug}
              className="group relative flex flex-col bg-white border border-[#e5e5e0] hover:border-[#121212] transition-colors duration-200 overflow-hidden"
            >
              {/* Category Silhouette Presentation */}
              <div className="relative aspect-4/3 bg-[#f5f5f3] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
                <img
                  src={getAssetUrl(category.thumbnail)}
                  alt={`${category.name} - ${category.repProduct}`}
                  loading="lazy"
                  className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
                />
              </div>

              {/* Category Information */}
              <div className="p-2.5 sm:p-4 md:p-5 flex flex-col flex-1 justify-between bg-white">
                <div>
                  {/* Eyebrow tag shown on sm+ */}
                  <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-[#b91c1c] mb-1">
                    {category.tagline}
                  </span>

                  {/* Category Name */}
                  <h3 className="text-xs sm:text-base lg:text-lg font-bold uppercase tracking-tight text-[#121212] truncate">
                    {category.name}
                  </h3>

                  {/* Long description hidden on mobile for compact card height */}
                  <p className="hidden md:block text-xs text-[#737373] mt-1.5 leading-relaxed">
                    {category.description}
                  </p>
                </div>

                {/* Representative product note hidden on mobile */}
                <div className="hidden md:flex mt-4 pt-3 border-t border-[#f0f0ed] items-center justify-between">
                  <span className="text-[11px] font-medium text-[#737373]">
                    Đại diện: <strong className="text-[#121212]">{category.repProduct}</strong>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShopByCategory;
