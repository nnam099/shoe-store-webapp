import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig, getAssetUrl } from '../../config/site';

export default function BrandLogos({ activeBrands = null }) {
  // Catalog options already counts only Products that satisfy public visibility rules.
  const brands = useMemo(() => {
    if (!Array.isArray(activeBrands)) {
      return [];
    }

    const eligibleBrands = activeBrands.filter((brand) => brand.productCount > 0);

    // Slugs of the five hardcoded brands
    const knownSlugs = new Set(siteConfig.brands.map((b) => b.id));
    const eligibleSlugSet = new Set(eligibleBrands.map((b) => b.slug));

    // Existing five brands: require API eligibility, prefer API logo/name,
    // and retain the approved local SVG as the visual fallback.
    const knownBrands = siteConfig.brands
      .filter((b) => eligibleSlugSet.has(b.id))
      .map((b) => {
        const backendBrand = eligibleBrands.find((ab) => ab.slug === b.id);
        return {
          ...b,
          id: b.id,
          slug: b.id,
          name: backendBrand?.name || b.name,
          logo: backendBrand?.logoUrl || b.logo,
        };
      });

    // New brands created via Admin that are not in the hardcoded list.
    // Only show brands that have an uploaded logo to avoid broken images.
    const newBrands = eligibleBrands
      .filter((b) => !knownSlugs.has(b.slug) && b.logoUrl)
      .map((b) => ({
        id: b.slug,
        slug: b.slug,
        name: b.name,
        logo: b.logoUrl,
      }));

    return [...knownBrands, ...newBrands];
  }, [activeBrands]);

  if (brands.length === 0) return null;

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
        {marqueeItems.map((brand, index) => {
          const isDecorativeClone = index >= brands.length;

          return (
            <Link
              key={`${brand.id}-${index}`}
              to={`/products?brand=${brand.id}`}
              className="shrink-0 px-5 sm:px-8 lg:px-12 flex items-center justify-center transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] rounded-xs cursor-pointer"
              tabIndex={isDecorativeClone ? -1 : undefined}
              aria-hidden={isDecorativeClone ? 'true' : undefined}
              aria-label={isDecorativeClone ? undefined : `Xem tất cả sản phẩm ${brand.name}`}
            >
              <div className="h-10 sm:h-14 lg:h-18 w-24 sm:w-36 lg:w-48 flex items-center justify-center">
                <img
                  src={getAssetUrl(brand.logo)}
                  alt={isDecorativeClone ? '' : `${brand.name} logo`}
                  className="max-h-full max-w-full w-auto h-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
                  loading="lazy"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
