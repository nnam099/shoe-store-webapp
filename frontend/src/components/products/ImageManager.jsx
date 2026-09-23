import { resolveApiAssetUrl } from "../../api/http.js";

export function ImageManager({ images, busy, onMove, onRemove, onUpload }) {
  return (
    <section className="rounded-xl border border-white/60 bg-white/75 p-5 backdrop-blur">
      <h2 className="font-display text-xl font-black">Ảnh sản phẩm</h2>
      <p className="mt-1 text-sm text-slate-600">Ảnh đầu tiên là ảnh chính. JPG, PNG hoặc WebP; tối đa 5 MiB/ảnh và 8 ảnh.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {images.map((image, index) => (
          <article key={image.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <img className="aspect-square w-full rounded-md object-cover" src={resolveApiAssetUrl(image.path)} alt={`Ảnh sản phẩm ${index + 1}`} />
            <p className="mt-2 text-xs font-bold text-cobalt">{index === 0 ? "Ảnh chính" : `Vị trí ${index + 1}`}</p>
            <div className="mt-2 flex flex-wrap gap-1"><button type="button" className="rounded px-2 py-1 text-sm font-semibold disabled:opacity-30" disabled={busy || index === 0} onClick={() => onMove(index, -1)}>Lên</button><button type="button" className="rounded px-2 py-1 text-sm font-semibold disabled:opacity-30" disabled={busy || index === images.length - 1} onClick={() => onMove(index, 1)}>Xuống</button><button type="button" className="rounded px-2 py-1 text-sm font-semibold text-coral disabled:opacity-30" disabled={busy} onClick={() => onRemove(image)}>Gỡ</button></div>
          </article>
        ))}
      </div>
      <label className="mt-5 grid gap-2 text-sm font-semibold"><span>Thêm ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || images.length >= 8} onChange={(event) => { const files = [...event.target.files]; if (files.length > 0) onUpload(files); event.target.value = ""; }} /></label>
    </section>
  );
}
