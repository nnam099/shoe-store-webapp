import { siteConfig, getAssetUrl } from '../../config/site';

export default function BrandLogos() {
  const brands = siteConfig.brands;

  return (
    <section id="brands" className="py-12 sm:py-16 lg:py-20 bg-[#f8f8f6] border-b border-[#e6e6e2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 border-b border-[#e6e6e2] pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#991b1b]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#991b1b]">
                AUTHENTIC LINEUP
              </span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#121212]">
              Thương hiệu tuyển chọn
            </h2>
          </div>

          <p className="mt-2 sm:mt-0 text-xs sm:text-sm text-neutral-500 font-mono tracking-wider">
            05 BRANDS • FOOTWEAR
          </p>
        </div>

        {/* Brand Strip Grid / Mobile Horizontal Scroll */}
        <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex sm:grid sm:grid-cols-5 gap-4 min-w-max sm:min-w-0">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="group relative flex flex-col items-center justify-center p-6 sm:p-8 bg-white border border-[#e6e6e2] hover:border-[#121212] transition-colors duration-200 snap-center w-[160px] sm:w-auto shrink-0 select-none"
              >
                {/* Logo Container */}
                <div className="h-12 sm:h-14 w-full flex items-center justify-center">
                  <img
                    src={getAssetUrl(brand.logo)}
                    alt={`${brand.name} logo`}
                    className="max-h-full max-w-[120px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Brand label */}
                <span className="mt-4 text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400 group-hover:text-[#121212] transition-colors">
                  {brand.name}
                </span>

                {/* Subtle corner indicator on hover */}
                <div className="absolute top-0 right-0 w-2 h-2 bg-transparent group-hover:bg-[#991b1b] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
