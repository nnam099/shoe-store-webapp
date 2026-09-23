import { Link } from "react-router";

import { ProductCard } from "../products/ProductCard.jsx";

export function LatestProductsSection({ products, loading, error, onRetry }) {
  return (
    <section aria-labelledby="latest-products-title" className="border-y border-line bg-white/35">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Vừa lên kệ</p>
            <h2 id="latest-products-title" className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">Sản phẩm mới nhất</h2>
          </div>
          <Link to="/san-pham" className="rounded-lg px-2 py-2 text-sm font-bold text-cobalt underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
            Xem tất cả
          </Link>
        </div>

        <div className="mt-7">
          {loading ? (
            <p role="status" className="rounded-xl border border-line bg-surface-glass px-5 py-16 text-center text-sm text-muted backdrop-blur-sm">Đang tải sản phẩm mới nhất...</p>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-5 text-coral">
              <p>{error}</p>
              <button type="button" className="mt-3 min-h-10 rounded-lg px-1 font-bold underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt" onClick={onRetry}>Thử tải lại sản phẩm</button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface-glass px-5 py-14 text-center backdrop-blur-sm">
              <p className="font-display text-xl font-bold text-ink">Chưa có sản phẩm mới.</p>
              <p className="mt-2 text-sm text-muted">Bạn có thể xem toàn bộ danh mục để tìm đôi giày phù hợp.</p>
            </div>
          ) : (
            <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="w-[82vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
