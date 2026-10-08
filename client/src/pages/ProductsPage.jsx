import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getFilterOptions, ALLOWED_SORTS } from '../services/catalogService';
import ProductCard from '../components/catalog/ProductCard';
import ProductFilters from '../components/products/ProductFilters';
import MobileFilterDrawer from '../components/products/MobileFilterDrawer';
import ActiveFilterChips from '../components/products/ActiveFilterChips';
import Pagination from '../components/products/Pagination';

/**
 * 6 Approved Sort Modes for STEP/LAB Product Listing
 */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'name-asc', label: 'Tên A-Z' },
  { value: 'name-desc', label: 'Tên Z-A' },
];

/**
 * ProductsPage Component
 * Full-featured product catalog listing supporting search, multi-faceted filtering,
 * 6 approved sorting modes, deterministic pagination, and bi-directional URL synchronization.
 */
function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter options derived from catalog
  const filterOptions = useMemo(() => getFilterOptions(), []);

  // Parse applied filters from URL with strict sanitization
  const appliedFilters = useMemo(() => {
    const q = searchParams.get('q') || '';
    const brandStr = searchParams.get('brand') || '';
    const categoryStr = searchParams.get('category') || '';
    const colorStr = searchParams.get('color') || '';
    const sizeStr = searchParams.get('size') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const rawSort = searchParams.get('sort');
    const sort = ALLOWED_SORTS.includes(rawSort) ? rawSort : 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;

    return {
      q,
      brand: brandStr ? brandStr.split(',').filter(Boolean) : [],
      category: categoryStr ? categoryStr.split(',').filter(Boolean) : [],
      color: colorStr ? colorStr.split(',').filter(Boolean) : [],
      size: sizeStr ? sizeStr.split(',').filter(Boolean) : [],
      minPrice,
      maxPrice,
      sort,
      page,
    };
  }, [searchParams]);

  // Helper to commit new params into URL
  const updateParams = useCallback((newOverrides, navOptions = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      Object.entries(newOverrides).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          if (val.length > 0) {
            next.set(key, val.join(','));
          } else {
            next.delete(key);
          }
        } else if (val != null && val !== '') {
          // Do not write default sort, invalid sort, or default page=1 to keep URL clean
          if (key === 'sort' && (val === 'newest' || !ALLOWED_SORTS.includes(val))) {
            next.delete(key);
          } else if (key === 'page' && Number(val) === 1) {
            next.delete(key);
          } else {
            next.set(key, String(val));
          }
        } else {
          next.delete(key);
        }
      });

      return next;
    }, navOptions);
  }, [setSearchParams]);

  // Local search input state with debounce
  const [searchInput, setSearchInput] = useState(appliedFilters.q);
  const [prevUrlQ, setPrevUrlQ] = useState(appliedFilters.q);

  // Sync search input when URL changes (e.g. Back/Forward)
  if (prevUrlQ !== appliedFilters.q) {
    setPrevUrlQ(appliedFilters.q);
    setSearchInput(appliedFilters.q);
  }

  // Debounced search update using replace: true
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== appliedFilters.q) {
        updateParams({ q: searchInput, page: 1 }, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, appliedFilters.q, updateParams]);

  // Mobile drawer open state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Query catalog data
  const { items, total, totalPages, currentPage } = useMemo(() => {
    return getProducts({
      q: appliedFilters.q,
      brand: appliedFilters.brand,
      category: appliedFilters.category,
      color: appliedFilters.color,
      size: appliedFilters.size,
      minPrice: appliedFilters.minPrice,
      maxPrice: appliedFilters.maxPrice,
      sort: appliedFilters.sort,
      page: appliedFilters.page,
      pageSize: 12,
    });
  }, [appliedFilters]);

  // Filter action handlers
  const handleToggleBrand = (slug) => {
    const current = appliedFilters.brand;
    const next = current.includes(slug)
      ? current.filter((x) => x !== slug)
      : [...current, slug];
    updateParams({ brand: next, page: 1 });
  };

  const handleToggleCategory = (slug) => {
    const current = appliedFilters.category;
    const next = current.includes(slug)
      ? current.filter((x) => x !== slug)
      : [...current, slug];
    updateParams({ category: next, page: 1 });
  };

  const handleToggleColor = (id) => {
    const current = appliedFilters.color;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    updateParams({ color: next, page: 1 });
  };

  const handleToggleSize = (size) => {
    const current = appliedFilters.size;
    const next = current.includes(size)
      ? current.filter((x) => x !== size)
      : [...current, size];
    updateParams({ size: next, page: 1 });
  };

  const handlePriceChange = (type, val) => {
    if (type === 'min') updateParams({ minPrice: val, page: 1 });
    if (type === 'max') updateParams({ maxPrice: val, page: 1 });
  };

  const handleSortChange = (newSort) => {
    const validSort = ALLOWED_SORTS.includes(newSort) ? newSort : 'newest';
    updateParams({ sort: validSort, page: 1 });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveFilter = (key, val) => {
    if (key === 'brand') {
      updateParams({ brand: appliedFilters.brand.filter((x) => x !== val), page: 1 });
    } else if (key === 'category') {
      updateParams({ category: appliedFilters.category.filter((x) => x !== val), page: 1 });
    } else if (key === 'color') {
      updateParams({ color: appliedFilters.color.filter((x) => x !== val), page: 1 });
    } else if (key === 'size') {
      updateParams({ size: appliedFilters.size.filter((x) => x !== val), page: 1 });
    } else if (key === 'price') {
      updateParams({ minPrice: '', maxPrice: '', page: 1 });
    } else if (key === 'q') {
      setSearchInput('');
      updateParams({ q: '', page: 1 });
    }
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handleApplyMobileDraft = (draft) => {
    updateParams({
      brand: draft.brand,
      category: draft.category,
      color: draft.color,
      size: draft.size,
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
      page: 1,
    });
  };

  const activeFilterCount =
    appliedFilters.brand.length +
    appliedFilters.category.length +
    appliedFilters.color.length +
    appliedFilters.size.length +
    (appliedFilters.minPrice ? 1 : 0) +
    (appliedFilters.maxPrice ? 1 : 0);

  return (
    <div className="bg-[#f8f8f6] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs & Title */}
        <div className="mb-6 sm:mb-8">
          <nav className="text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1.5 select-none">
            <a href="/" className="hover:text-[#121212] transition-colors">
              Trang chủ
            </a>
            <span>/</span>
            <span className="text-[#121212]">Tất cả sản phẩm</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#121212]">
                Tất cả sản phẩm
              </h1>
              <p className="text-xs text-[#737373] mt-1">
                Hiển thị <strong className="text-[#121212]">{total}</strong> mẫu sneaker tuyển chọn
              </p>
            </div>

            {/* Mobile Filter Toggle & Sort Bar */}
            <div className="flex items-center gap-2 sm:hidden pt-3 border-t border-[#e5e5e0]">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="flex-1 py-2 px-3 bg-white border border-[#e5e5e0] hover:border-[#121212] text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center justify-center gap-2 rounded-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#121212] text-white text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <select
                value={appliedFilters.sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-40 py-2 px-2 bg-white border border-[#e5e5e0] text-xs font-semibold text-[#121212] rounded-xs focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search & Top Action Bar (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5e5e0]">
          {/* Search Box */}
          <div className="relative w-72 lg:w-80">
            <input
              type="text"
              placeholder="Tìm theo tên, hãng, màu sắc..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full text-xs py-2 pl-9 pr-8 bg-white border border-[#e5e5e0] focus:border-[#121212] focus:outline-none rounded-xs transition-colors"
            />
            <svg
              className="w-4 h-4 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateParams({ q: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] hover:text-[#121212]"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-xs text-[#737373] font-medium">Sắp xếp:</span>
            <select
              value={appliedFilters.sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="py-1.5 px-3 bg-white border border-[#e5e5e0] hover:border-[#121212] text-xs font-semibold text-[#121212] rounded-xs focus:outline-none cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips (Mobile only: visible on mobile, hidden on tablet/desktop where Sidebar is active) */}
        <ActiveFilterChips
          appliedFilters={appliedFilters}
          options={filterOptions}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAll}
        />

        {/* Main Content Layout: Sidebar + Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 lg:gap-8 items-start mt-4">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block md:col-span-1 bg-white p-5 border border-[#e5e5e0] rounded-xs sticky top-24">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e5e5e0]">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
                Bộ lọc
              </h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-[#b91c1c] hover:underline uppercase"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <ProductFilters
              options={filterOptions}
              selectedBrands={appliedFilters.brand}
              selectedCategories={appliedFilters.category}
              selectedColors={appliedFilters.color}
              selectedSizes={appliedFilters.size}
              minPrice={appliedFilters.minPrice}
              maxPrice={appliedFilters.maxPrice}
              onToggleBrand={handleToggleBrand}
              onToggleCategory={handleToggleCategory}
              onToggleColor={handleToggleColor}
              onToggleSize={handleToggleSize}
              onPriceChange={handlePriceChange}
            />
          </aside>

          {/* Products Grid Section */}
          <div className="col-span-1 md:col-span-3">
            {total === 0 ? (
              /* Empty State */
              <div className="bg-white border border-[#e5e5e0] p-10 sm:p-16 text-center rounded-xs my-6">
                <div className="w-12 h-12 mx-auto mb-4 text-[#a3a3a3]">
                  <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#121212] mb-1.5">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="text-xs text-[#737373] max-w-sm mx-auto mb-6">
                  Vui lòng thử tìm kiếm bằng từ khóa khác hoặc xóa bớt tiêu chí lọc để xem thêm các mẫu giày khác.
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-5 py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            ) : (
              <>
                {/* 2 columns on mobile, 3 columns on tablet/desktop */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                  {items.map((product) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      colorway={product.displayColorway}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        appliedFilters={appliedFilters}
        onApplyDraft={handleApplyMobileDraft}
        options={filterOptions}
      />
    </div>
  );
}

export default ProductsPage;
