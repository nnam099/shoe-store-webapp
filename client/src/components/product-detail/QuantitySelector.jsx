/**
 * QuantitySelector Component
 * Controls order quantity within limits: 1 <= quantity <= stock.
 * Disabled when no valid variant is selected.
 */
function QuantitySelector({
  quantity = 1,
  maxStock = 1,
  disabled = false,
  onChangeQuantity,
}) {
  const isMinusDisabled = disabled || quantity <= 1;
  const isPlusDisabled = disabled || quantity >= maxStock;

  const handleDecrease = () => {
    if (!isMinusDisabled) {
      onChangeQuantity(Math.max(1, quantity - 1));
    }
  };

  const handleIncrease = () => {
    if (!isPlusDisabled) {
      onChangeQuantity(Math.min(maxStock, quantity + 1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
        Số lượng:
      </span>

      <div
        className={`inline-flex items-center border border-[#e5e5e0] bg-white rounded-xs self-start ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {/* Decrease Button */}
        <button
          type="button"
          disabled={isMinusDisabled}
          onClick={handleDecrease}
          aria-label="Giảm số lượng"
          className="w-11 h-11 flex items-center justify-center text-[#121212] hover:bg-[#f5f5f3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>

        {/* Quantity Display */}
        <span
          className="w-12 h-11 flex items-center justify-center text-sm font-extrabold text-[#121212] border-x border-[#e5e5e0] select-none"
          aria-live="polite"
        >
          {quantity}
        </span>

        {/* Increase Button */}
        <button
          type="button"
          disabled={isPlusDisabled}
          onClick={handleIncrease}
          aria-label="Tăng số lượng"
          className="w-11 h-11 flex items-center justify-center text-[#121212] hover:bg-[#f5f5f3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default QuantitySelector;
