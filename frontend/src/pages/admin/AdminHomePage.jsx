import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

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
    <main className="min-h-screen bg-auth px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/60 bg-white/75 p-6 shadow-xl shadow-cobalt/10 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Admin</p>
            <h1 className="mt-2 font-display text-3xl font-black">Khu vực quản trị</h1>
            <p className="mt-3 text-slate-600">Xin chào, {account.fullName}.</p>
          </div>
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold" onClick={() => { logout(); navigate("/admin/dang-nhap", { replace: true }); }}>
            Đăng xuất
          </button>
        </div>
        {message ? <p role="status" className="mt-7 rounded-xl bg-mint/15 p-4 text-emerald-800">{message}</p> : <p role="status" className="mt-7">Đang kiểm tra quyền quản trị...</p>}
        {error ? <p role="alert" className="mt-7 rounded-xl bg-coral/10 p-4 text-coral">{error}</p> : null}
        <p className="mt-5 text-sm text-slate-600">Dashboard nghiệp vụ sẽ được triển khai ở kế hoạch riêng.</p>
      </section>
    </main>
  );
}
