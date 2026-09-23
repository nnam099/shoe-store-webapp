import { Link } from "react-router";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function CartSummary({ cart }) {
  return (
    <aside className="h-fit rounded-2xl border border-line bg-surface-glass p-6 backdrop-blur-sm lg:sticky lg:top-24">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Tóm tắt</p>
      <div className="mt-5 flex items-center justify-between gap-4 border-b border-line pb-5">
        <span className="font-semibold text-slate-700">Tổng tiền hàng</span>
        <strong className="font-display text-2xl font-black text-ink">{money.format(cart.subtotal)}</strong>
      </div>
      {cart.hasUnavailableItems ? (
        <p role="alert" className="mt-4 rounded-lg bg-coral/10 p-3 text-sm leading-5 text-coral">
          Tổng tiền chỉ gồm các dòng đang khả dụng và có thể thay đổi sau khi bạn xử lý dòng lỗi.
        </p>
      ) : (
        <p className="mt-4 text-sm leading-5 text-muted">Giá được cập nhật theo dữ liệu hiện hành từ cửa hàng.</p>
      )}
      <Link
        to="/san-pham"
        className="mt-6 flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-bold text-ink transition hover:border-cobalt hover:text-cobalt"
      >
        Tiếp tục mua sắm
      </Link>
    </aside>
  );
}
