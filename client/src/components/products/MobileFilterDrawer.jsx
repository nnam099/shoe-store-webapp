import { useState, useEffect } from 'react';
import ProductFilters from './ProductFilters';

/**
 * MobileFilterDrawer Component
 * Slide-over drawer on mobile displaying filter controls in DRAFT state.
 * Only commits changes to URL upon clicking "Áp dụng".
 */
function MobileFilterDrawer({
  isOpen,
  onClose,
  appliedFilters,
  onApplyDraft,
  options,
}) {
  const [draftBrands, setDraftBrands] = useState([]);
  const [draftCategories, setDraftCategories] = useState([]);
  const [draftColors, setDraftColors] = useState([]);
  const [draftSizes, setDraftSizes] = useState([]);
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [prevOpenState, setPrevOpenState] = useState(false);

  // Sync draft state directly during render when drawer opens
  if (isOpen && !prevOpenState) {
    setPrevOpenState(true);
    setDraftBrands(appliedFilters.brand || []);
    setDraftCategories(appliedFilters.category || []);
    setDraftColors(appliedFilters.color || []);
    setDraftSizes(appliedFilters.size || []);
    setDraftMinPrice(appliedFilters.minPrice || '');
    setDraftMaxPrice(appliedFilters.maxPrice || '');
  } else if (!isOpen && prevOpenState) {
    setPrevOpenState(false);
  }

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handlePriceChange = (type, val) => {
    if (type === 'min') setDraftMinPrice(val);
    if (type === 'max') setDraftMaxPrice(val);
  };

  const handleClearDraft = () => {
    setDraftBrands([]);
    setDraftCategories([]);
    setDraftColors([]);
    setDraftSizes([]);
    setDraftMinPrice('');
    setDraftMaxPrice('');
  };

  const handleApply = () => {
    onApplyDraft({
      brand: draftBrands,
      category: draftCategories,
      color: draftColors,
      size: draftSizes,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
    });
    onClose();
  };

  const activeDraftCount =
    draftBrands.length +
    draftCategories.length +
    draftColors.length +
    draftSizes.length +
    (draftMinPrice ? 1 : 0) +
    (draftMaxPrice ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="relative z-10 w-full max-w-xs sm:max-w-sm h-full bg-[#f8f8f6] shadow-2xl flex flex-col justify-between overflow-hidden border-l border-[#e5e5e0]"
        role="dialog"
        aria-modal="true"
        aria-label="Bộ lọc sản phẩm"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e0] bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-[#121212]">
              Bộ lọc sản phẩm
            </h3>
            {activeDraftCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#121212] text-white text-[10px] font-bold flex items-center justify-center">
                {activeDraftCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#737373] hover:text-[#121212] transition-colors rounded-xs"
            aria-label="Đóng bộ lọc"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1">
          <ProductFilters
            options={options}
            selectedBrands={draftBrands}
            selectedCategories={draftCategories}
            selectedColors={draftColors}
            selectedSizes={draftSizes}
            minPrice={draftMinPrice}
            maxPrice={draftMaxPrice}
            onToggleBrand={(slug) => toggleItem(draftBrands, setDraftBrands, slug)}
            onToggleCategory={(slug) => toggleItem(draftCategories, setDraftCategories, slug)}
            onToggleColor={(id) => toggleItem(draftColors, setDraftColors, id)}
            onToggleSize={(size) => toggleItem(draftSizes, setDraftSizes, size)}
            onPriceChange={handlePriceChange}
          />
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#e5e5e0] bg-white grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClearDraft}
            className="w-full py-2.5 px-3 border border-[#e5e5e0] text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-[#121212] hover:border-[#121212] transition-colors rounded-xs"
          >
            Xóa tất cả
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-2.5 px-3 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xs"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileFilterDrawer;
