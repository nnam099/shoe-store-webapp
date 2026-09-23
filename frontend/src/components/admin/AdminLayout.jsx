import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { useAuth } from "../../auth/useAuth.js";

const navigation = [
  { to: "/admin", label: "Tổng quan", end: true },
  { to: "/admin/san-pham", label: "Sản phẩm" },
  { to: "/admin/danh-muc", label: "Danh mục & thuộc tính" },
];

export function AdminLayout() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function signOut() {
    logout();
    navigate("/admin/dang-nhap", { replace: true });
  }

  return (
    <div className="min-h-screen bg-auth text-slate-950 lg:grid lg:grid-cols-[17rem_1fr]">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur lg:hidden">
        <NavLink to="/admin" className="font-display text-xl font-black text-cobalt">SẢI Admin</NavLink>
        <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen((value) => !value)}>
          Menu
        </button>
      </header>
      <aside id="admin-navigation" className={`${open ? "block" : "hidden"} fixed inset-x-0 top-16 z-20 border-b border-white/10 bg-slate-950 p-5 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0`}>
        <NavLink to="/admin" className="hidden font-display text-2xl font-black tracking-tight text-white lg:block">SẢI</NavLink>
        <p className="mt-1 hidden text-sm text-slate-400 lg:block">Sải bước, đúng chất.</p>
        <nav className="mt-3 grid gap-2 lg:mt-10" aria-label="Điều hướng quản trị">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `rounded-lg px-4 py-3 text-sm font-semibold transition ${isActive ? "bg-cobalt text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 border-t border-white/10 pt-5 lg:absolute lg:inset-x-5 lg:bottom-5">
          <p className="truncate text-sm font-semibold">{account.fullName}</p>
          <p className="truncate text-xs text-slate-400">{account.email}</p>
          <button type="button" className="mt-3 min-h-10 w-full rounded-lg border border-white/20 px-3 text-sm font-semibold hover:bg-white/10" onClick={signOut}>Đăng xuất</button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
