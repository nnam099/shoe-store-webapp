import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from '../utils/authValidation';

const NEUTRAL_SUCCESS_MESSAGE = 'Mật khẩu đã được cập nhật nếu thông tin tài khoản hợp lệ. Vui lòng đăng nhập lại.';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', newPassword: '', newPasswordConfirmation: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const continueToPassword = (event) => {
    event.preventDefault();
    const emailError = validateEmail(form.email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      newPassword: validatePassword(form.newPassword, 'Mật khẩu mới'),
      newPasswordConfirmation: validatePasswordMatch(form.newPassword, form.newPasswordConfirmation),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await forgotPassword({
        email: form.email.trim(),
        newPassword: form.newPassword,
        newPasswordConfirmation: form.newPasswordConfirmation,
      });
      navigate('/login', { replace: true, state: { message: NEUTRAL_SUCCESS_MESSAGE } });
    } catch (error) {
      setSubmitError(error.message || 'Không thể cập nhật mật khẩu lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Quên mật khẩu"
      railMeta={`0${step} / 02`}
      description="Đặt lại mật khẩu để tiếp tục truy cập tài khoản của bạn."
      crop={step === 1 ? 'passwordResetStepOne' : 'security'}
      footer={(
        <Link className="font-bold text-[#121212] underline underline-offset-4" to="/login">
          Quay lại đăng nhập
        </Link>
      )}
    >
      <div className="max-w-md">
        <h1 className="text-3xl sm:text-[2.125rem] font-black tracking-tight leading-tight">
          {step === 1 ? 'Quên mật khẩu' : 'Đặt mật khẩu mới'}
        </h1>
        <p className="mt-2 text-xs leading-5 text-[#737373]">
          {step === 1
            ? 'Nhập email đã dùng khi đăng ký tài khoản.'
            : `Email đã chọn: ${form.email.trim()}`}
        </p>

        {step === 1 ? (
          <form className="mt-6 space-y-5" onSubmit={continueToPassword} noValidate>
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
            <button
              type="submit"
              className="min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
            >
              Tiếp tục
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="newPassword"
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              required
              value={form.newPassword}
              error={errors.newPassword}
              onChange={handleChange}
            />
            <AuthField
              id="newPasswordConfirmation"
              label="Xác nhận mật khẩu mới"
              type="password"
              autoComplete="new-password"
              required
              value={form.newPasswordConfirmation}
              error={errors.newPasswordConfirmation}
              onChange={handleChange}
            />

            {submitError && (
              <p role="alert" className="border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
                {submitError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="min-h-[46px] border border-[#d4d4ce] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-[#121212] hover:bg-[#f5f5f3] disabled:opacity-60"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[46px] bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
