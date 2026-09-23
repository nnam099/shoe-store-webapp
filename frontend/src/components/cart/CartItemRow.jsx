import { Link } from "react-router";

import { resolveApiAssetUrl } from "../../api/http.js";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function CartItemRow({
  item,
  draftQuantity,
  busy,
  onDraftChange,
  onUpdate,
  onRemove,
}) {
  const productName = item.product?.name ?? "Sản phẩm không còn bán";
  const canEdit = item.status === "available" || item.status === "insufficient_stock";
  const parsedQuantity = Number(draftQuantity);
  const validDraft = Number.isInteger(parsedQuantity) && parsedQuantity > 0;
  const changed = validDraft && parsedQuantity !== item.quantity;

  return (
    <article className={`rounded-2xl border p-4 backdrop-blur-sm sm:p-5 ${item.status === "available" ? "border-line bg-surface-glass" : "border-coral/30 bg-coral/5"}`}>
      <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
          {item.product?.mainImage ? (
            <img
              src={resolveApiAssetUrl(item.product.mainImage)}
              alt={productName}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-xs text-slate-400">Không có ảnh</div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {item.product && item.status !== "not_for_sale" ? (
                <Link className="font-display text-lg font-black text-ink hover:text-cobalt" to={`/san-pham/${item.product.slug}`}>
                  {productName}
                </Link>
              ) : (
                <h2 className="font-display text-lg font-black text-ink">{productName}</h2>
              )}
              <p className="mt-1 text-sm text-muted">
                Size {item.variant?.size.value ?? "—"} · Màu {item.variant?.color.name ?? "—"}
              </p>
            </div>
            {item.status === "available" ? (
              <span className="rounded-full bg-mint/20 px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase text-emerald-800">Còn hàng</span>
            ) : (
              <span className="rounded-full bg-coral/15 px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase text-coral">Không còn khả dụng</span>
            )}
          </div>

          {item.message ? <p className="mt-3 text-sm font-semibold text-coral">{item.message}</p> : null}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:max-w-md">
            <div>
              <dt className="text-muted">Đơn giá hiện hành</dt>
              <dd className="mt-1 font-bold text-ink">{item.unitPrice === null ? "—" : money.format(item.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-muted">Thành tiền</dt>
              <dd className="mt-1 font-display font-black text-cobalt">{item.lineTotal === null ? "—" : money.format(item.lineTotal)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            {canEdit ? (
              <div>
                <label htmlFor={`cart-quantity-${item.productVariantId}`} className="block text-xs font-bold uppercase tracking-wide text-muted">
                  Số lượng
                </label>
                <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-line bg-white">
                  <button
                    type="button"
                    className="min-h-10 min-w-10 font-bold text-ink disabled:opacity-40"
                    aria-label={`Giảm số lượng ${productName}`}
                    disabled={busy || !validDraft || parsedQuantity <= 1}
                    onClick={() => onDraftChange(String(parsedQuantity - 1))}
                  >
                    −
                  </button>
                  <input
                    id={`cart-quantity-${item.productVariantId}`}
                    aria-label={`Số lượng ${productName}`}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={draftQuantity}
                    disabled={busy}
                    onChange={(event) => onDraftChange(event.target.value)}
                    className="min-h-10 w-16 border-x border-line text-center font-mono font-bold outline-none focus:bg-cobalt/5"
                  />
                  <button
                    type="button"
                    className="min-h-10 min-w-10 font-bold text-ink disabled:opacity-40"
                    aria-label={`Tăng số lượng ${productName}`}
                    disabled={busy || !validDraft}
                    onClick={() => onDraftChange(String(parsedQuantity + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Số lượng trong giỏ: <strong className="text-ink">{item.quantity}</strong></p>
            )}

            {canEdit ? (
              <button
                type="button"
                className="min-h-10 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-40"
                disabled={busy || !changed}
                onClick={() => onUpdate(parsedQuantity)}
              >
                {busy ? "Đang lưu..." : "Cập nhật"}
              </button>
            ) : null}

            {item.status === "insufficient_stock" && item.stockQuantity > 0 ? (
              <button
                type="button"
                className="min-h-10 rounded-lg bg-cobalt px-4 text-sm font-bold text-white disabled:opacity-40"
                disabled={busy}
                onClick={() => onUpdate(item.stockQuantity)}
              >
                Cập nhật về {item.stockQuantity}
              </button>
            ) : null}

            <button
              type="button"
              className="min-h-10 rounded-lg border border-coral/40 px-4 text-sm font-bold text-coral transition hover:bg-coral/10 disabled:opacity-40 sm:ml-auto"
              disabled={busy}
              onClick={onRemove}
            >
              Xóa dòng
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
