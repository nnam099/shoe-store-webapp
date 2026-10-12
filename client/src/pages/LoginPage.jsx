import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import { validateEmail } from '../utils/authValidation';

const SAFE_MEMBER_DESTINATIONS = new Set(['/account', '/account/change-password']);

function getSafeDestination(value) {
  if (typeof value !== 'string') return '/account';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('#')) return '/account';

  const destination = new URL(value, 'https://steplab.local');
  const { pathname, searchParams } = destination;
  if (SAFE_MEMBER_DESTINATIONS.has(pathname) && !destination.search) return pathname;

  if (pathname === '/account/orders') {
    const keys = [...searchParams.keys()];
    const page = searchParams.get('page');
    const hasSafeQuery = keys.length === 0
      || (keys.length === 1 && keys[0] === 'page' && /^[1-9]\d*$/.test(page || ''));
    return hasSafeQuery ? `${pathname}${destination.search}` : '/account';
  }

  if (/^\/account\/orders\/[A-Za-z0-9-]{1,50}$/.test(pathname) && !destination.search) {
    return pathname;
  }

  return '/account';
}

export default function LoginPage() {
  const { isAuthenticated, isInitializing, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to={getSafeDestination(location.state?.from)} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: form.password ? '' : 'Vui lòng nhập mật khẩu.',
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(getSafeDestination(location.state?.from), { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Không thể đăng nhập lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Member access"
      title="Đăng nhập"
      description="Đăng nhập để quản lý hồ sơ Member và mua sắm thuận tiện hơn."
      footer={(
        <p>
          Chưa có tài khoản?{' '}
          <Link className="font-bold text-[#121212] underline underline-offset-4" to="/register">
            Đăng ký
          </Link>
        </p>
      )}
    >
      <div className="max-w-md">
        <h2 className="text-xl font-black uppercase tracking-tight">Chào mừng trở lại</h2>
        <p className="mt-2 text-xs leading-5 text-[#737373]">Đăng nhập để tiếp tục mua sắm tại STEP/LAB.</p>

        {location.state?.message && (
          <p role="status" className="mt-5 border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs text-[#166534]">
            {location.state.message}
          </p>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            error={errors.email}
            onChange={handleChange}
          />
          <AuthField
            id="password"
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            error={errors.password}
            onChange={handleChange}
          />

          <div className="flex justify-end">
            <Link className="text-xs font-bold text-[#525252] hover:text-[#991b1b] underline underline-offset-4" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>

          {submitError && (
            <p role="alert" className="border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
