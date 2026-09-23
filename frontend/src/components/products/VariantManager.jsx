import { useState } from "react";

export function VariantManager({ variants, options, busy, onAdd, onUpdate, onRemove }) {
  const [newVariant, setNewVariant] = useState({ sizeId: "", colorId: "", stockQuantity: "0" });
  const [stocks, setStocks] = useState({});

  return (
    <section className="rounded-xl border border-white/60 bg-white/75 p-5 backdrop-blur">
      <h2 className="font-display text-xl font-black">Biến thể & tồn kho</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="p-3">Size</th><th className="p-3">Màu</th><th className="p-3">Tồn kho</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{variant.size.value}</td><td className="p-3">{variant.color.name}</td><td className="p-3"><input className="w-28 rounded-lg border border-slate-300 px-3 py-2" aria-label={`Tồn kho ${variant.size.value} ${variant.color.name}`} type="number" min="0" step="1" value={stocks[variant.id] ?? variant.stockQuantity} onChange={(event) => setStocks((current) => ({ ...current, [variant.id]: event.target.value }))} /></td><td className="p-3 text-right"><button type="button" className="mr-2 rounded px-2 py-2 font-semibold text-cobalt" disabled={busy} onClick={() => onUpdate(variant.id, Number(stocks[variant.id] ?? variant.stockQuantity))}>Lưu kho</button><button type="button" className="rounded px-2 py-2 font-semibold text-coral" disabled={busy} onClick={() => onRemove(variant)}>Xóa</button></td></tr>)}</tbody></table></div>
      <form className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); onAdd({ sizeId: Number(newVariant.sizeId), colorId: Number(newVariant.colorId), stockQuantity: Number(newVariant.stockQuantity) }); }}>
        <label className="grid gap-1 text-sm font-semibold"><span>Size</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-2" value={newVariant.sizeId} onChange={(event) => setNewVariant((current) => ({ ...current, sizeId: event.target.value }))}><option value="">Chọn size</option>{options.sizes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold"><span>Màu</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-2" value={newVariant.colorId} onChange={(event) => setNewVariant((current) => ({ ...current, colorId: event.target.value }))}><option value="">Chọn màu</option>{options.colors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold"><span>Tồn kho</span><input className="min-h-10 rounded-lg border border-slate-300 px-2" type="number" min="0" step="1" value={newVariant.stockQuantity} onChange={(event) => setNewVariant((current) => ({ ...current, stockQuantity: event.target.value }))} /></label>
        <button className="min-h-10 self-end rounded-lg bg-slate-950 px-3 font-bold text-white disabled:opacity-50" disabled={busy || !newVariant.sizeId || !newVariant.colorId}>Thêm biến thể</button>
      </form>
    </section>
  );
}
