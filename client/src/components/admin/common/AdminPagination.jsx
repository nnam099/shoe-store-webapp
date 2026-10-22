/**
 * AdminPagination — Standard pagination component for Admin list pages.
 * Shows page numbers, previous/next buttons and item count summary.
 */
export default function AdminPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, totalItems, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);

  // Build page range (show up to 5 pages around current)
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e5e5e0] px-4 py-3">
      <p className="text-xs text-[#6b7280]">
        Hiển thị {start}–{end} / {totalItems} kết quả
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center border border-[#e5e5e0] text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang trước"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pages[0] > 1 && (
          <>
            <button type="button" onClick={() => onPageChange(1)} className="flex h-8 w-8 items-center justify-center border border-[#e5e5e0] text-xs text-[#374151] hover:bg-[#f3f4f6] transition-colors">1</button>
            {pages[0] > 2 && <span className="px-1 text-xs text-[#9ca3af]">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center border text-xs font-medium transition-colors ${
              p === page
                ? 'bg-[#121212] border-[#121212] text-white'
                : 'border-[#e5e5e0] text-[#374151] hover:bg-[#f3f4f6]'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-[#9ca3af]">…</span>}
            <button type="button" onClick={() => onPageChange(totalPages)} className="flex h-8 w-8 items-center justify-center border border-[#e5e5e0] text-xs text-[#374151] hover:bg-[#f3f4f6] transition-colors">{totalPages}</button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center border border-[#e5e5e0] text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang sau"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
