import { getAssetUrl } from '../../config/site';

/**
 * Format price in Vietnamese Dong (VND)
 */
const formatVND = (amount) => {
  if (amount == null) return '';
  return `${amount.toLocaleString('vi-VN')} ₫`;
};

/**
 * STEP/LAB Product Card Component
 * Reusable product display card adhering to editorial aesthetic:
 * - Studio product thumbnail with subtle hover zoom
 * - Brand label, product title, formatted VND price
 * - Sale badge when on promotion (-15%)
 * - Hairline border interaction without fake navigation or dead links
 */
function ProductCard({ product, colorway }) {
  const activeColorway = colorway || product.displayColorway || product.defaultColorway;
  const { name, brand } = product;
  const { price, salePrice, thumbnail } = activeColorway;
  const hasSale = salePrice !== null && salePrice < price;
  const discountPercent = hasSale ? Math.round(((price - salePrice) / price) * 100) : 0;

  return (
    <div className="group relative flex flex-col bg-white border border-[#e5e5e0] hover:border-[#121212] transition-colors duration-200 overflow-hidden">
      {/* Product Image Stage */}
      <div className="relative aspect-square bg-[#f5f5f3] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
        {hasSale && (
          <span className="absolute top-2.5 left-2.5 z-10 bg-[#b91c1c] text-white text-[10px] sm:text-xs font-bold tracking-wider uppercase px-2 py-0.5">
            -{discountPercent}%
          </span>
        )}
        <img
          src={getAssetUrl(thumbnail)}
          alt={`${brand.name} ${name}`}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#737373]">
            {brand.name}
          </span>
          <h3 className="text-xs sm:text-sm font-semibold text-[#121212] mt-0.5 line-clamp-1" title={name}>
            {name}
          </h3>
        </div>

        {/* Pricing */}
        <div className="mt-2.5 sm:mt-3 pt-2 border-t border-[#f0f0ed] flex items-baseline gap-1.5 flex-wrap">
          {hasSale ? (
            <>
              <span className="text-xs sm:text-sm font-bold text-[#b91c1c]">
                {formatVND(salePrice)}
              </span>
              <span className="text-[10px] sm:text-xs text-[#a3a3a3] line-through">
                {formatVND(price)}
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-[#121212]">
              {formatVND(price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
