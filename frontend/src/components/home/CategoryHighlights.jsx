import { Link } from "react-router";

export function CategoryHighlights({ categories, loading, error, onRetry }) {
  return (
    <section id="danh-muc-noi-bat" aria-labelledby="category-highlights-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Danh mục</p>
          <h2 id="category-highlights-title" className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">Chọn lối đi của bạn</h2>
        </div>
        <Link to="/san-pham" className="rounded-lg px-2 py-2 text-sm font-bold text-cobalt underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
          Tất cả sản phẩm
        </Link>
      </div>

      <div className="mt-7">
        {loading ? (
          <p role="status" className="rounded-xl border border-line bg-surface-glass px-5 py-8 text-center text-sm text-muted backdrop-blur-sm">Đang tải danh mục...</p>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-5 text-coral">
            <p>{error}</p>
            <button type="button" className="mt-3 min-h-10 rounded-lg px-1 font-bold underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt" onClick={onRetry}>Thử lại</button>
          </div>
        ) : categories.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface-glass px-5 py-8 text-center text-sm text-muted backdrop-blur-sm">Chưa có danh mục sản phẩm.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => (
              <li key={category.id}>
                <Link
                  to={`/san-pham?categoryId=${encodeURIComponent(category.id)}`}
                  className="group flex min-h-24 items-end justify-between rounded-xl border border-line bg-surface-glass p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cobalt/35 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                >
                  <span className="font-display text-base font-bold text-ink sm:text-lg">{category.name}</span>
                  <span className="font-mono text-xs font-bold text-cobalt" aria-hidden="true">{String(index + 1).padStart(2, "0")} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
