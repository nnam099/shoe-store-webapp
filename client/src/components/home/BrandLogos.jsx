import { siteConfig, getAssetUrl } from '../../config/site';

export default function BrandLogos() {
  const brands = siteConfig.brands;
  // Repeat list for infinite loop marquee track (-50% translation)
  const marqueeItems = [...brands, ...brands, ...brands, ...brands];

  return (
    <section
      id="brands"
      className="relative w-full overflow-hidden bg-[#f8f8f6] border-y border-[#e6e6e2] py-4 sm:py-8 lg:py-12 select-none"
      aria-label="Thương hiệu đối tác"
    >
      {/* Edge gradient fade masks for high-end editorial vignette */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-24 lg:w-36 bg-gradient-to-r from-[#f8f8f6] via-[#f8f8f6]/80 to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-24 lg:w-36 bg-gradient-to-l from-[#f8f8f6] via-[#f8f8f6]/80 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Single Universal Infinite Scrolling Marquee Track for all screen sizes */}
      <div className="flex animate-marquee items-center">
        {marqueeItems.map((brand, index) => (
          <div
            key={`${brand.id}-${index}`}
            className="shrink-0 px-5 sm:px-8 lg:px-12 flex items-center justify-center transition-transform duration-300 hover:scale-105"
            aria-hidden={index >= brands.length ? 'true' : undefined}
          >
            <div className="h-10 sm:h-14 lg:h-18 w-24 sm:w-36 lg:w-48 flex items-center justify-center">
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
    </section>
  );
}
