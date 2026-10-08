/**
 * SizeSelector Component
 * Displays EU 36-44 sizes with variant stock availability.
 * Size with stock === 0 is visible but disabled.
 * Provides stock status and trigger for Size Guide modal.
 */
function SizeSelector({
  variants = [],
  selectedSize = null,
  onSelectSize,
  onOpenSizeGuide,
}) {
  const selectedVariant = variants.find((v) => v.size === selectedSize);

  return (
    <div className="w-full">
      {/* Header: Label + Size Guide Link */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
          Kích cỡ:{' '}
          {selectedSize ? (
            <strong className="text-[#121212] ml-1 font-extrabold">EU {selectedSize}</strong>
          ) : (
            <span className="text-[#b91c1c] text-[11px] font-semibold lowercase ml-1">
              (vui lòng chọn kích cỡ)
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onOpenSizeGuide}
          className="text-xs font-semibold text-[#121212] hover:text-[#b91c1c] underline underline-offset-2 transition-colors cursor-pointer select-none"
        >
          Hướng dẫn chọn size
        </button>
      </div>

      {/* EU 36-44 Grid (3 or 4 columns) */}
      <div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2"
        role="group"
        aria-label="Chọn kích cỡ EU"
      >
        {variants.map((v) => {
          const isSelected = v.size === selectedSize;
          const isOutOfStock = v.stock === 0;

          if (isOutOfStock) {
            return (
              <button
                key={v.size}
                type="button"
                disabled
                aria-disabled="true"
                aria-label={`EU ${v.size} - Hết hàng`}
                className="relative h-11 bg-[#f5f5f3] border border-[#e5e5e0] text-xs font-medium text-[#a3a3a3] rounded-xs cursor-not-allowed select-none flex flex-col items-center justify-center overflow-hidden"
              >
                <span>EU {v.size}</span>
                <span className="text-[9px] text-[#a3a3a3] tracking-tight">Hết hàng</span>
                {/* Subtle diagonal line */}
                <div
                  className="absolute inset-0 border-t border-[#d4d4cb] -rotate-25 origin-center pointer-events-none"
                  aria-hidden="true"
                />
              </button>
            );
          }

          return (
            <button
              key={v.size}
              type="button"
              aria-pressed={isSelected}
              aria-label={`EU ${v.size}`}
              onClick={() => onSelectSize(v.size)}
              className={`h-11 text-xs font-bold rounded-xs transition-colors cursor-pointer select-none flex items-center justify-center ${
                isSelected
                  ? 'bg-[#121212] text-white border border-[#121212] ring-1 ring-[#121212]'
                  : 'bg-white text-[#121212] border border-[#e5e5e0] hover:border-[#121212]'
              }`}
            >
              EU {v.size}
            </button>
          );
        })}
      </div>

      {/* Stock UX Message */}
      <div className="mt-3 min-h-[20px]">
        {selectedVariant ? (
          selectedVariant.stock === 0 ? (
            <p className="text-xs font-semibold text-[#a3a3a3]">Hết hàng</p>
          ) : selectedVariant.stock <= 3 ? (
            <p className="text-xs font-bold text-[#b91c1c]">
              Chỉ còn {selectedVariant.stock} đôi
            </p>
          ) : (
            <p className="text-xs font-medium text-[#16a34a]">Còn hàng</p>
          )
        ) : (
          <p className="text-[11px] text-[#737373]">
            Chọn kích cỡ để kiểm tra số lượng có sẵn
          </p>
        )}
      </div>
    </div>
  );
}

export default SizeSelector;
