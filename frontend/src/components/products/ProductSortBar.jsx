export function ProductSortBar({ totalItems, sort, onSortChange }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-4 py-3">
      <p className="text-sm text-muted">Hiển thị <strong className="text-ink">{totalItems}</strong> sản phẩm</p>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        Sắp xếp
        <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={(event) => onSortChange(event.target.value)} className="min-h-10 rounded-lg border border-line bg-white px-3">
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="name_asc">Tên A-Z</option>
        </select>
      </label>
    </div>
  );
}
