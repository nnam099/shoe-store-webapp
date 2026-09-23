export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Phân trang">
      <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trang trước</button>
      <span className="text-sm text-slate-600">Trang {page}/{totalPages}</span>
      <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold disabled:opacity-40" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Trang sau</button>
    </nav>
  );
}
