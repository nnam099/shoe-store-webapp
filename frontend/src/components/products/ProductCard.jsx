import { Link } from "react-router";

import { resolveApiAssetUrl } from "../../api/http.js";
import { ProductStockBadge } from "./ProductStockBadge.jsx";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const badgeLabels = { new: "Mới", bestseller: "Bán chạy", featured: "Nổi bật" };

export function ProductCard({ product }) {
  return (
    <article className="group rounded-2xl border border-line bg-surface-glass p-3 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-sm">
      <Link to={`/san-pham/${product.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          {product.mainImage ? (
            <img
              src={resolveApiAssetUrl(product.mainImage)}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-400">Chưa có ảnh</div>
          )}
          {product.badgeLabel ? (
            <span className="absolute left-3 top-3 rounded-full bg-coral px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase text-white">
              {badgeLabels[product.badgeLabel]}
            </span>
          ) : null}
        </div>
        <div className="px-1 pb-1 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{product.brand.name}</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-bold leading-snug text-ink">{product.name}</h2>
            <ProductStockBadge inStock={product.inStock} />
          </div>
          <p className="mt-1 text-sm text-muted">{product.category.name}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-lg font-black text-cobalt">{money.format(product.effectivePrice)}</span>
            {product.salePrice !== null ? (
              <span className="text-sm text-slate-400 line-through">{money.format(product.price)}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
