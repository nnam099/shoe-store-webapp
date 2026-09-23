import { useState } from "react";

function ToggleGroup({ legend, items, selected, onToggle, valueKey = "name", showColor = false }) {
  return (
    <fieldset className="border-t border-line pt-5">
      <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">{legend}</legend>
      <div className="grid gap-2">
        {items.map((item) => (
          <label key={item.id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="h-4 w-4 accent-cobalt"
            />
            {showColor ? (
              <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: item.hex_code ?? "transparent" }} />
            ) : null}
            {item[valueKey]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProductFilterSidebar({ draft, setDraft, options, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const toggle = (field, id) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((value) => value !== id)
        : [...current[field], id],
    }));
  };

  return (
    <aside className="self-start md:sticky md:top-24">
      <button
        type="button"
        className="mb-3 min-h-11 w-full rounded-lg bg-ink px-4 font-bold text-white md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Đóng bộ lọc" : "Mở bộ lọc"}
      </button>
      <form
        className={`${open ? "block" : "hidden"} rounded-2xl border border-line bg-surface-glass p-5 backdrop-blur-sm md:block`}
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
          setOpen(false);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-black">Bộ lọc</h2>
          <button type="button" onClick={onClear} className="text-sm font-semibold text-cobalt hover:underline">Xóa lọc</button>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Tìm theo tên
          <input
            aria-label="Tìm theo tên sản phẩm"
            value={draft.q}
            onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
            className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
            placeholder="Ví dụ: giày chạy"
            maxLength={200}
          />
        </label>
        <div className="mt-5 grid gap-5">
          <ToggleGroup legend="Thương hiệu" items={options.brands} selected={draft.brandIds} onToggle={(id) => toggle("brandIds", id)} />
          <ToggleGroup legend="Loại giày" items={options.categories} selected={draft.categoryIds} onToggle={(id) => toggle("categoryIds", id)} />
          <ToggleGroup legend="Màu sắc" items={options.colors} selected={draft.colorIds} onToggle={(id) => toggle("colorIds", id)} showColor />
          <fieldset className="border-t border-line pt-5">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {options.sizes.map((item) => (
                <label key={item.id} className={`grid min-h-10 cursor-pointer place-items-center rounded-lg border text-sm font-bold ${draft.sizeIds.includes(item.id) ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-700"}`}>
                  <input type="checkbox" className="sr-only" checked={draft.sizeIds.includes(item.id)} onChange={() => toggle("sizeIds", item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="border-t border-line pt-5">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Khoảng giá</legend>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Giá tối thiểu" type="number" min="0" step="1" value={draft.minPrice} onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value }))} className="min-h-11 min-w-0 rounded-lg border border-line bg-white px-2" placeholder="Từ" />
              <input aria-label="Giá tối đa" type="number" min="0" step="1" value={draft.maxPrice} onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value }))} className="min-h-11 min-w-0 rounded-lg border border-line bg-white px-2" placeholder="Đến" />
            </div>
          </fieldset>
        </div>
        <button className="mt-6 min-h-11 w-full rounded-lg bg-ink px-4 font-bold text-white transition hover:bg-cobalt">
          Áp dụng bộ lọc
        </button>
      </form>
    </aside>
  );
}
