import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { adminApi } from "../../api/admin.api.js";
import { useAuth } from "../../auth/useAuth.js";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

export function AdminHomePage() {
  useDocumentTitle("Khu vực quản trị");
  const { token, account, logout } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi
      .getIndex(token)
      .then((result) => {
        if (active) setMessage(result.message);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401 || requestError.status === 403) {
          logout();
          navigate("/admin/dang-nhap", { replace: true });
          return;
        }
        setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [token, logout, navigate]);

  return (
    <section className="mx-auto max-w-5xl">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-black">Khu vực quản trị</h1>
      <p className="mt-3 text-slate-600">Xin chào, {account.fullName}.</p>
      {message ? <p role="status" className="mt-7 rounded-xl bg-mint/15 p-4 text-emerald-800">{message}</p> : <p role="status" className="mt-7">Đang kiểm tra quyền quản trị...</p>}
      {error ? <p role="alert" className="mt-7 rounded-xl bg-coral/10 p-4 text-coral">{error}</p> : null}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Link className="rounded-xl border border-white/60 bg-white/70 p-5 font-bold shadow-sm backdrop-blur hover:bg-white" to="/admin/san-pham">Quản lý sản phẩm</Link>
        <Link className="rounded-xl border border-white/60 bg-white/70 p-5 font-bold shadow-sm backdrop-blur hover:bg-white" to="/admin/danh-muc">Danh mục & thuộc tính</Link>
      </div>
    </section>
  );
}
