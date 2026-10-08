/**
 * ProductFilters Component
 * Reusable filter controls for Brands, Categories, Colors, Sizes, and Price bounds.
 * Used directly in Desktop Sidebar and wrapped with draft state in Mobile Drawer.
 */
function ProductFilters({
  options,
  selectedBrands = [],
  selectedCategories = [],
  selectedColors = [],
  selectedSizes = [],
  minPrice = '',
  maxPrice = '',
  onToggleBrand,
  onToggleCategory,
  onToggleColor,
  onToggleSize,
  onPriceChange,
}) {
  const { brands = [], categories = [], colors = [], sizes = [] } = options || {};

  return (
    <div className="space-y-6 select-none">
      {/* 1. Brands */}
      <div className="pb-5 border-b border-[#e5e5e0]">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#121212] mb-3">
          Thương hiệu
        </h4>
        <div className="space-y-2">
          {brands.map((brand) => {
            const isChecked = selectedBrands.includes(brand.slug);
            return (
              <label
                key={brand.slug}
                className="flex items-center justify-between text-xs font-medium text-[#404040] hover:text-[#121212] cursor-pointer py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleBrand(brand.slug)}
                    className="w-4 h-4 rounded-xs border-[#d4d4d0] text-[#121212] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#121212]"
                  />
                  <span>{brand.name}</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] font-mono">({brand.count})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Categories */}
      <div className="pb-5 border-b border-[#e5e5e0]">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#121212] mb-3">
          Danh mục
        </h4>
        <div className="space-y-2">
          {categories.map((cat) => {
            const isChecked = selectedCategories.includes(cat.slug);
            return (
              <label
                key={cat.slug}
                className="flex items-center justify-between text-xs font-medium text-[#404040] hover:text-[#121212] cursor-pointer py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCategory(cat.slug)}
                    className="w-4 h-4 rounded-xs border-[#d4d4d0] text-[#121212] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#121212]"
                  />
                  <span>{cat.name}</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] font-mono">({cat.count})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Colors */}
      <div className="pb-5 border-b border-[#e5e5e0]">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#121212] mb-3">
          Màu sắc
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((color) => {
            const isSelected = selectedColors.includes(color.id);
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onToggleColor(color.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#121212] text-white ring-1 ring-[#121212]'
                    : 'bg-white text-[#404040] border border-[#e5e5e0] hover:border-[#a3a3a3]'
                }`}
                aria-pressed={isSelected}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: color.hex,
                    borderColor: color.border || color.hex,
                  }}
                  aria-hidden="true"
                />
                <span className="truncate">{color.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Sizes */}
      <div className="pb-5 border-b border-[#e5e5e0]">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#121212]">
            Kích cỡ (EU)
          </h4>
          <span className="text-[10px] text-[#737373]">Còn hàng</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
          {sizes.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => onToggleSize(size)}
                className={`h-9 flex items-center justify-center text-xs font-bold transition-all border rounded-xs ${
                  isSelected
                    ? 'bg-[#121212] text-white border-[#121212]'
                    : 'bg-white text-[#121212] border-[#e5e5e0] hover:border-[#121212]'
                }`}
                aria-pressed={isSelected}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Price Range */}
      <div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#121212] mb-3">
          Khoảng giá (₫)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="min-price-input" className="block text-[10px] text-[#737373] uppercase mb-1">
              Từ (₫)
            </label>
            <input
              id="min-price-input"
              type="number"
              placeholder="0"
              min="0"
              step="50000"
              value={minPrice}
              onChange={(e) => onPriceChange('min', e.target.value)}
              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#e5e5e0] focus:border-[#121212] focus:outline-none rounded-xs"
            />
          </div>
          <div>
            <label htmlFor="max-price-input" className="block text-[10px] text-[#737373] uppercase mb-1">
              Đến (₫)
            </label>
            <input
              id="max-price-input"
              type="number"
              placeholder="4.000.000"
              min="0"
              step="50000"
              value={maxPrice}
              onChange={(e) => onPriceChange('max', e.target.value)}
              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#e5e5e0] focus:border-[#121212] focus:outline-none rounded-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductFilters;
