function uniqueBy(items, getKey) {
  return [...new Map(items.map((item) => [getKey(item), item])).values()];
}

export function ProductVariantPicker({ variants, selectedColorId, selectedSizeId, onColorChange, onSizeChange }) {
  const colors = uniqueBy(variants.map((variant) => variant.color), (color) => color.id);
  const sizes = uniqueBy(variants.map((variant) => variant.size), (size) => size.id);
  const colorDisabled = (colorId) =>
    !variants.some(
      (variant) =>
        variant.color.id === colorId &&
        (!selectedSizeId || variant.size.id === selectedSizeId) &&
        variant.inStock,
    );
  const sizeDisabled = (sizeId) =>
    !variants.some(
      (variant) =>
        variant.size.id === sizeId &&
        (!selectedColorId || variant.color.id === selectedColorId) &&
        variant.inStock,
    );

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Màu sắc</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((color) => {
            const disabled = colorDisabled(color.id);
            return (
              <button key={color.id} type="button" disabled={disabled} aria-pressed={selectedColorId === color.id} aria-label={`Chọn màu ${color.name}`} onClick={() => onColorChange(color.id)} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${selectedColorId === color.id ? "border-cobalt bg-cobalt text-white" : "border-line bg-white"} disabled:cursor-not-allowed disabled:opacity-35`}>
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color.hexCode ?? "transparent" }} />
                {color.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((size) => {
            const disabled = sizeDisabled(size.id);
            return (
              <button key={size.id} type="button" disabled={disabled} aria-pressed={selectedSizeId === size.id} aria-label={`Chọn size ${size.value}`} onClick={() => onSizeChange(size.id)} className={`grid min-h-11 min-w-12 place-items-center rounded-lg border px-3 text-sm font-bold transition ${selectedSizeId === size.id ? "border-ink bg-ink text-white" : "border-line bg-white"} disabled:cursor-not-allowed disabled:opacity-35`}>
                {size.value}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
