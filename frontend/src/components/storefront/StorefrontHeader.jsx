import { Link, NavLink } from "react-router";

import { useAuth } from "../../auth/useAuth.js";

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-cobalt/10 text-cobalt" : "text-slate-700 hover:bg-white/70 hover:text-cobalt"
  }`;

export function StorefrontHeader() {
  const { account, status } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-2xl font-black tracking-tight text-ink" aria-label="SẢI - Trang chủ">
          SẢI<span className="text-cobalt">.</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="order-3 flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto">
          <NavLink to="/" end className={navClass}>Trang chủ</NavLink>
          <NavLink to="/san-pham" className={navClass}>Sản phẩm</NavLink>
          <span className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 lg:inline">Tra cứu đơn</span>
        </nav>
        <div className="flex items-center gap-2">
          {status === "authenticated" && account?.role === "customer" ? (
            <Link to="/tai-khoan" className="rounded-lg px-3 py-2 text-sm font-semibold text-cobalt">
              {account.fullName}
            </Link>
          ) : (
            <Link to="/dang-nhap" className="rounded-lg px-3 py-2 text-sm font-semibold text-cobalt">
              Đăng nhập
            </Link>
          )}
          <span className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white">Giỏ hàng</span>
        </div>
      </div>
    </header>
  );
}
