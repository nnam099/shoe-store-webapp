export function ProductStockBadge({ inStock }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wide ${
        inStock ? "bg-mint/20 text-emerald-800" : "bg-slate-200 text-slate-500 line-through decoration-slate-400"
      }`}
    >
      {inStock ? "Còn hàng" : "Hết hàng"}
    </span>
  );
}
