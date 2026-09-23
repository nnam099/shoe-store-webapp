import { useState } from "react";

import { resolveApiAssetUrl } from "../../api/http.js";

export function ProductGallery({ images, productName }) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? null);
  const selected = images.find((image) => image.id === selectedId) ?? images[0];

  if (!selected) {
    return <div className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-muted">Chưa có ảnh</div>;
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-white">
        <img src={resolveApiAssetUrl(selected.path)} alt={`${productName} - ảnh ${selected.position}`} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6" aria-label="Thư viện ảnh sản phẩm">
          {images.map((image) => (
            <button key={image.id} type="button" onClick={() => setSelectedId(image.id)} aria-label={`Xem ảnh ${image.position}`} className={`aspect-square overflow-hidden rounded-lg border-2 bg-white ${selected.id === image.id ? "border-cobalt" : "border-transparent"}`}>
              <img src={resolveApiAssetUrl(image.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
