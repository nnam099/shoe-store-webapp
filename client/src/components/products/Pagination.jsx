/**
 * Pagination Component
 * Clean, tactile pagination controls with active state and aria accessibility.
 */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-center gap-1.5 py-8 select-none" aria-label="Phân trang sản phẩm">
      {/* Previous Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-10 px-3.5 flex items-center justify-center border border-[#e5e5e0] bg-white text-xs font-bold uppercase tracking-wider text-[#121212] hover:border-[#121212] disabled:opacity-40 disabled:pointer-events-none transition-colors rounded-xs"
        aria-label="Trang trước"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Trước</span>
      </button>

      {/* Numbered Pages */}
      <div className="flex items-center gap-1.5">
        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-10 h-10 flex items-center justify-center text-xs font-bold transition-all rounded-xs ${
                isActive
                  ? 'bg-[#121212] text-white border border-[#121212]'
                  : 'bg-white text-[#121212] border border-[#e5e5e0] hover:border-[#121212]'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Trang ${p}`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-10 px-3.5 flex items-center justify-center border border-[#e5e5e0] bg-white text-xs font-bold uppercase tracking-wider text-[#121212] hover:border-[#121212] disabled:opacity-40 disabled:pointer-events-none transition-colors rounded-xs"
        aria-label="Trang sau"
      >
        <span className="hidden sm:inline">Sau</span>
        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}

export default Pagination;
