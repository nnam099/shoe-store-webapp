export function ProductPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Phân trang sản phẩm" className="mt-8 flex items-center justify-center gap-3">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="min-h-10 rounded-lg border border-line bg-white px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
      <span className="font-mono text-sm">Trang {page}/{totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="min-h-10 rounded-lg border border-line bg-white px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
    </nav>
  );
}
