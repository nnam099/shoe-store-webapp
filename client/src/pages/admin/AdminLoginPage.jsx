import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminErrorMessage } from '../../utils/adminHelpers';

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/admin/products';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already authenticated — redirect
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black uppercase tracking-widest text-white">STEP/LAB</h1>
          <div className="mt-2 inline-block border border-[#991b1b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f87171]">
            Administration Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a]">
          <div className="px-6 py-5 border-b border-[#2a2a2a]">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Đăng nhập Quản trị</h2>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4" noValidate>
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 border border-[#7f1d1d] bg-[#450a0a] px-4 py-3" role="alert">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#f87171]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-[#fca5a5]">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                Email Quản trị
              </label>
              <input
                id="admin-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="w-full border border-[#3f3f46] bg-[#27272a] px-3 py-2.5 text-sm text-white placeholder-[#6b7280] focus:border-[#991b1b] focus:outline-none disabled:opacity-50 transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                Mật khẩu
              </label>
              <input
                id="admin-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="w-full border border-[#3f3f46] bg-[#27272a] px-3 py-2.5 text-sm text-white placeholder-[#6b7280] focus:border-[#991b1b] focus:outline-none disabled:opacity-50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full bg-[#991b1b] py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#7f1d1d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xác thực...
                </span>
              ) : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="border-t border-[#2a2a2a] px-6 py-4">
            <p className="text-[11px] text-[#6b7280] text-center">
              Tài khoản demo: <span className="font-mono text-[#9ca3af]">admin.ltw@gmail.com</span>
            </p>
          </div>
        </div>

        {/* Back to storefront */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-[11px] text-[#6b7280] hover:text-[#9ca3af] transition-colors"
          >
            ← Quay về trang mua hàng
          </a>
        </div>
      </div>
    </div>
  );
}
