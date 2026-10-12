import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import { validatePassword, validatePasswordMatch } from '../utils/authValidation';

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      currentPassword: form.currentPassword ? '' : 'Vui lòng nhập mật khẩu hiện tại.',
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
      await changePassword(form);
      navigate('/login', {
        replace: true,
        state: { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' },
      });
    } catch (error) {
      setSubmitError(error.message || 'Không thể thay đổi mật khẩu lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account security"
      title="Đổi mật khẩu"
      description="Bảo vệ tài khoản bằng cách cập nhật mật khẩu khi cần thiết."
      crop="security"
      footer={(
        <Link className="font-bold text-[#121212] underline underline-offset-4" to="/account">
          Quay lại tài khoản
        </Link>
      )}
    >
      <div className="max-w-md">
        <h1 className="text-3xl sm:text-[2.125rem] font-black tracking-tight leading-tight">Đổi mật khẩu</h1>
        <p className="mt-2 text-xs leading-5 text-[#737373]">Mật khẩu mới cần có ít nhất 8 ký tự.</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="currentPassword"
            label="Mật khẩu hiện tại"
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            error={errors.currentPassword}
            onChange={handleChange}
          />
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
