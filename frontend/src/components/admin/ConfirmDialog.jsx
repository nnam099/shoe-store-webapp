export function ConfirmDialog({ open, title, description, busy = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
      <section className="w-full max-w-md rounded-xl border border-white/60 bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <h2 id="confirm-title" className="font-display text-xl font-black">{title}</h2>
        <p id="confirm-description" className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold" disabled={busy} onClick={onCancel}>Không xóa</button>
          <button type="button" className="min-h-10 rounded-lg bg-coral px-4 font-bold text-white disabled:opacity-60" disabled={busy} onClick={onConfirm}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</button>
        </div>
      </section>
    </div>
  );
}
