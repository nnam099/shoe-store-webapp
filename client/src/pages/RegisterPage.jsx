import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
} from '../utils/authValidation';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
};

export default function RegisterPage() {
  const { isAuthenticated, isInitializing, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/account" replace />;
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
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      password: validatePassword(form.password),
      passwordConfirmation: validatePasswordMatch(form.password, form.passwordConfirmation),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
      });
      navigate('/account', { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Không thể đăng ký lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New member"
      title="Tạo tài khoản"
      description="Tạo tài khoản Member để lưu thông tin cá nhân và mua sắm thuận tiện hơn."
      footer={(
        <p>
          Đã có tài khoản?{' '}
          <Link className="font-bold text-[#121212] underline underline-offset-4" to="/login">
            Đăng nhập
          </Link>
        </p>
      )}
    >
      <div className="max-w-lg">
        <h2 className="text-xl font-black uppercase tracking-tight">Thông tin tài khoản</h2>
        <p className="mt-2 text-xs leading-5 text-[#737373]">Các trường có dấu * là bắt buộc.</p>

        <form className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="fullName"
            label="Họ và tên"
            autoComplete="name"
            required
            value={form.fullName}
            error={errors.fullName}
            onChange={handleChange}
            className="sm:col-span-2"
          />
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
            id="phone"
            label="Số điện thoại"
            type="tel"
            autoComplete="tel"
            required
            value={form.phone}
            error={errors.phone}
            onChange={handleChange}
          />
          <AuthField
            id="password"
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            error={errors.password}
            onChange={handleChange}
          />
          <AuthField
            id="passwordConfirmation"
            label="Xác nhận mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            value={form.passwordConfirmation}
            error={errors.passwordConfirmation}
            onChange={handleChange}
          />

          {submitError && (
            <p role="alert" className="sm:col-span-2 border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="sm:col-span-2 min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
          >
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
