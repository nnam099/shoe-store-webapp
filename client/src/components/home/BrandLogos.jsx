import { siteConfig, getAssetUrl } from '../../config/site';

export default function BrandLogos() {
  const brands = siteConfig.brands;
  // Repeat list for desktop infinite loop marquee track (-50% translation)
  const marqueeItems = [...brands, ...brands, ...brands, ...brands];

  return (
    <section
      id="brands"
      className="relative w-full overflow-hidden bg-[#f8f8f6] border-y border-[#e6e6e2] py-6 sm:py-12 lg:py-16 select-none"
      aria-label="Thương hiệu đối tác"
    >
      {/* Edge gradient fade masks for high-end editorial vignette */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-28 lg:w-40 bg-gradient-to-r from-[#f8f8f6] via-[#f8f8f6]/80 to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-28 lg:w-40 bg-gradient-to-l from-[#f8f8f6] via-[#f8f8f6]/80 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Desktop (md+): Infinite scrolling marquee track */}
      <div className="hidden md:flex animate-marquee items-center">
        {marqueeItems.map((brand, index) => (
          <div
            key={`${brand.id}-desktop-${index}`}
            className="shrink-0 px-6 sm:px-10 lg:px-14 flex items-center justify-center transition-transform duration-300 hover:scale-105"
            aria-hidden={index >= brands.length ? 'true' : undefined}
          >
            <div className="h-16 lg:h-20 w-40 sm:w-48 lg:w-56 flex items-center justify-center">
              <img
                src={getAssetUrl(brand.logo)}
                alt={`${brand.name} logo`}
                className="max-h-full max-w-full w-auto h-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mobile (< md): Natural horizontal touch/swipe showing ~2-3 brands with snap */}
      <div className="flex md:hidden overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 py-1 gap-3 items-center">
        {brands.map((brand) => (
          <div
            key={`${brand.id}-mobile`}
            className="snap-center shrink-0 w-[42vw] min-w-[140px] max-w-[180px] h-20 flex items-center justify-center px-4 py-2 bg-white/70 border border-[#e6e6e2]"
          >
            <img
              src={getAssetUrl(brand.logo)}
              alt={`${brand.name} logo`}
              className="max-h-12 max-w-full w-auto h-auto object-contain opacity-90"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
