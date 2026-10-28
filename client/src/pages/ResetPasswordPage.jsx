import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import { validatePassword, validatePasswordMatch } from '../utils/authValidation';
import {
  capturePasswordResetToken,
  clearCapturedPasswordResetToken,
} from '../utils/passwordResetToken';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    return capturePasswordResetToken(window.location.hash);
  });
  const [form, setForm] = useState({ newPassword: '', newPasswordConfirmation: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      newPassword: validatePassword(form.newPassword, 'Mật khẩu mới'),
      newPasswordConfirmation: validatePasswordMatch(form.newPassword, form.newPasswordConfirmation),
    };
    if (!token) nextErrors.token = 'Liên kết đặt lại mật khẩu không hợp lệ.';
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await resetPassword({ token, ...form });
      clearCapturedPasswordResetToken();
      navigate('/login', { replace: true, state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' } });
    } catch (error) {
      if (error.code === 'RESET_TOKEN_INVALID' || error.code === 'RESET_TOKEN_EXPIRED') {
        clearCapturedPasswordResetToken();
      }
      setSubmitError(error.message || 'Không thể đặt lại mật khẩu lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Password reset" title="Đặt mật khẩu mới" description="Liên kết chỉ dùng một lần và có hiệu lực 15 phút." crop="security" footer={<Link to="/forgot-password" className="font-bold underline">Yêu cầu liên kết mới</Link>}>
      <form className="max-w-md space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthField id="newPassword" label="Mật khẩu mới" type="password" autoComplete="new-password" required value={form.newPassword} error={errors.newPassword} onChange={handleChange} />
        <AuthField id="newPasswordConfirmation" label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" required value={form.newPasswordConfirmation} error={errors.newPasswordConfirmation} onChange={handleChange} />
        {(errors.token || submitError) && <p role="alert" className="border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">{errors.token || submitError}</p>}
        <button type="submit" disabled={submitting || !token} className="min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-60">
          {submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    </AuthShell>
  );
}
