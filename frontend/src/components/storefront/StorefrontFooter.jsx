export function StorefrontFooter() {
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Thanh toán</p><p className="mt-2 text-sm text-white/75">COD — thanh toán khi nhận hàng.</p></div>
        <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Tồn kho</p><p className="mt-2 text-sm text-white/75">Kiểm tra đúng size và màu trước khi thêm giỏ.</p></div>
        <div><p className="font-display text-xl font-black">SẢI</p><p className="mt-2 text-sm text-white/75">Sải bước, đúng chất.</p></div>
      </div>
    </footer>
  );
}
