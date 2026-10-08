/**
 * ActiveFilterChips Component
 * Displays removable tags for currently applied URL filters and a Clear All action.
 */
function ActiveFilterChips({
  appliedFilters,
  options,
  onRemoveFilter,
  onClearAll,
}) {
  const {
    q = '',
    brand = [],
    category = [],
    color = [],
    size = [],
    minPrice = '',
    maxPrice = '',
  } = appliedFilters;

  const { brands = [], categories = [], colors = [] } = options || {};

  const chips = [];

  // 1. Search keyword
  if (q) {
    chips.push({
      key: 'q',
      label: `Tìm: "${q}"`,
      onRemove: () => onRemoveFilter('q'),
    });
  }

  // 2. Brands
  brand.forEach((bSlug) => {
    const brandObj = brands.find((b) => b.slug === bSlug);
    chips.push({
      key: `brand-${bSlug}`,
      label: brandObj ? brandObj.name : bSlug,
      onRemove: () => onRemoveFilter('brand', bSlug),
    });
  });

  // 3. Categories
  category.forEach((cSlug) => {
    const catObj = categories.find((c) => c.slug === cSlug);
    chips.push({
      key: `category-${cSlug}`,
      label: catObj ? catObj.name : cSlug,
      onRemove: () => onRemoveFilter('category', cSlug),
    });
  });

  // 4. Colors
  color.forEach((cId) => {
    const colorObj = colors.find((c) => c.id === cId);
    chips.push({
      key: `color-${cId}`,
      label: colorObj ? colorObj.name : cId,
      onRemove: () => onRemoveFilter('color', cId),
    });
  });

  // 5. Sizes
  size.forEach((s) => {
    chips.push({
      key: `size-${s}`,
      label: `EU ${s}`,
      onRemove: () => onRemoveFilter('size', s),
    });
  });

  // 6. Price
  if (minPrice || maxPrice) {
    const formatPriceShort = (num) => {
      const n = Number(num);
      if (isNaN(n)) return '';
      return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}tr`;
    };

    let priceLabel = 'Giá: ';
    if (minPrice && maxPrice) {
      priceLabel += `${formatPriceShort(minPrice)} - ${formatPriceShort(maxPrice)}`;
    } else if (minPrice) {
      priceLabel += `≥ ${formatPriceShort(minPrice)}`;
    } else if (maxPrice) {
      priceLabel += `≤ ${formatPriceShort(maxPrice)}`;
    }

    chips.push({
      key: 'price',
      label: priceLabel,
      onRemove: () => onRemoveFilter('price'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mr-1">
        Đang lọc:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#e5e5e0] text-xs font-medium text-[#121212] rounded-xs shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-[#a3a3a3] hover:text-[#b91c1c] transition-colors p-0.5"
            aria-label={`Xóa bộ lọc ${chip.label}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-bold text-[#b91c1c] hover:underline ml-2 uppercase tracking-wider"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

export default ActiveFilterChips;
