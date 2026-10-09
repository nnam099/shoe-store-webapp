import { Link } from 'react-router-dom';
import { getAssetUrl, formatPrice } from '../../config/site';

/**
 * CartItem Component
 * Renders an individual cart row with live catalog price, real stock constraint,
 * and deliberate stock status indicators.
 */
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const {
    id,
    storedItem,
    product,
    colorway,
    currentStock,
    currentUnitPrice,
    originalPrice,
    isSale,
    effectiveQuantity,
    wasQuantityClamped,
    lineTotal,
  } = item;

  const isOutOfStock = currentStock === 0;

  // Build product back-link URL
  const targetUrl = product
    ? colorway?.slug !== product.defaultColorwaySlug
      ? `/products/${product.slug}?colorway=${colorway?.slug}`
      : `/products/${product.slug}`
    : `/products/${storedItem.productSlug}`;

  const brandName = product?.brand?.name || storedItem.brandName;
  const productName = product?.name || storedItem.productName;
  const colorwayName = colorway?.name || storedItem.colorwayName;
  const thumbnail = colorway?.thumbnail || storedItem.thumbnail;

  const isMinusDisabled = isOutOfStock || effectiveQuantity <= 1;
  const isPlusDisabled = isOutOfStock || effectiveQuantity >= currentStock;

  return (
    <article className="py-4 sm:py-6 border-b border-[#e5e5e0] bg-white p-3.5 sm:p-5 rounded-xs transition-colors grid grid-cols-[88px_1fr] sm:grid-cols-[112px_1fr] gap-x-3.5 sm:gap-x-6">
      {/* Product Image Stage */}
      <Link
        to={targetUrl}
        className="col-start-1 row-start-1 sm:row-span-2 w-[88px] h-[88px] sm:w-28 sm:h-28 shrink-0 bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs flex items-center justify-center p-2 sm:p-2.5 overflow-hidden group focus-visible:outline-2 focus-visible:outline-[#121212] self-start"
        aria-label={`Xem chi tiết ${productName}`}
      >
        <img
          src={getAssetUrl(thumbnail)}
          alt={`${productName} - ${colorwayName}`}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </Link>

      {/* Product Details & Actions */}
      <div className="col-start-2 row-start-1 min-w-0 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#737373]">
              {brandName}
            </span>
            <h3 className="text-xs sm:text-base font-extrabold text-[#121212] uppercase tracking-tight truncate mt-0.5">
              <Link
                to={targetUrl}
                className="hover:text-[#b91c1c] transition-colors"
              >
                {productName}
              </Link>
            </h3>
            <div className="text-[11px] sm:text-xs text-[#525252] mt-0.5 sm:mt-1 font-medium leading-tight">
              <div>
                Phối màu: <span className="font-semibold text-[#121212]">{colorwayName}</span>
              </div>
              <div>
                Kích cỡ: <span className="font-semibold text-[#121212]">EU {storedItem.size}</span>
              </div>
            </div>
          </div>

          {/* Remove Button (Touch Target >= 44x44px) */}
          <button
            type="button"
            onClick={() => onRemove(id)}
            aria-label={`Xóa ${productName} khỏi giỏ hàng`}
            className="min-w-[44px] min-h-[44px] w-11 h-11 -mr-2 -mt-2 sm:mr-0 sm:mt-0 shrink-0 flex items-center justify-center text-[#737373] hover:text-[#b91c1c] transition-colors rounded-xs cursor-pointer select-none"
            title="Xóa sản phẩm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Status Warnings */}
        {(isOutOfStock || currentStock <= 3 || wasQuantityClamped) && (
          <div className="mt-1.5 space-y-0.5">
            {isOutOfStock && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
                <span>Hết hàng</span>
              </div>
            )}

            {!isOutOfStock && currentStock <= 3 && (
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#b91c1c]">
                Chỉ còn {currentStock} đôi
              </p>
            )}

            {wasQuantityClamped && (
              <p className="text-[10px] sm:text-[11px] font-medium text-[#c2410c]">
                Số lượng đã được điều chỉnh theo tồn kho hiện tại.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Quantity Controls & Price */}
      <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-2 mt-3 pt-3 sm:mt-4 sm:pt-3 border-t border-[#f5f5f3] flex flex-wrap items-center justify-between gap-3">
        {/* Quantity Controls (Touch Target >= 44x44px for buttons) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider hidden sm:inline">
            SL:
          </span>
          <div
            className={`inline-flex items-center border border-[#e5e5e0] bg-white rounded-xs ${
              isOutOfStock ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <button
              type="button"
              disabled={isMinusDisabled}
              onClick={() => onUpdateQuantity(id, effectiveQuantity - 1, currentStock)}
              aria-label="Giảm số lượng"
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-[#121212] hover:bg-[#f5f5f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <span
              className="min-w-[44px] h-11 px-2 flex items-center justify-center text-xs sm:text-sm font-extrabold text-[#121212] border-x border-[#e5e5e0] select-none"
              aria-live="polite"
            >
              {effectiveQuantity}
            </span>

            <button
              type="button"
              disabled={isPlusDisabled}
              onClick={() => onUpdateQuantity(id, effectiveQuantity + 1, currentStock)}
              aria-label="Tăng số lượng"
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-[#121212] hover:bg-[#f5f5f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Price & Line Total */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            {isSale && (
              <span className="text-[11px] sm:text-xs text-[#a3a3a3] line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className={`text-sm sm:text-base font-extrabold tracking-tight ${isOutOfStock ? 'text-[#a3a3a3]' : 'text-[#121212]'}`}>
              {formatPrice(lineTotal)}
            </span>
          </div>
          {effectiveQuantity > 1 && (
            <span className="text-[10px] sm:text-[11px] text-[#737373]">
              {formatPrice(currentUnitPrice)} / đôi
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default CartItem;
