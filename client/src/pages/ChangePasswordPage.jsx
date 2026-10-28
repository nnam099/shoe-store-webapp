import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import { validatePassword, validatePasswordMatch } from '../utils/authValidation';

export default function ChangePasswordPage() {
  const { member, changePassword, sendSetupOtp, setupPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirmation: '', challengeId: '', otp: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSetup = !member?.hasPassword;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSendOtp = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await sendSetupOtp();
      setForm((current) => ({ ...current, challengeId: result.challengeId, otp: '' }));
      setMessage('Mã xác thực đã được gửi tới email tài khoản.');
    } catch (requestError) {
      setError(requestError.message || 'Không thể gửi mã xác thực.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const passwordError = validatePassword(form.newPassword, 'Mật khẩu mới')
      || validatePasswordMatch(form.newPassword, form.newPasswordConfirmation);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (isSetup && (!form.challengeId || !/^\d{6}$/.test(form.otp))) {
      setError('Vui lòng gửi và nhập mã xác thực 6 chữ số.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (isSetup) {
        await setupPassword({ challengeId: form.challengeId, otp: form.otp, newPassword: form.newPassword, newPasswordConfirmation: form.newPasswordConfirmation });
      } else {
        await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword, newPasswordConfirmation: form.newPasswordConfirmation });
      }
      navigate('/login', { replace: true, state: { message: isSetup ? 'Thiết lập mật khẩu thành công.' : 'Đổi mật khẩu thành công.' } });
    } catch (requestError) {
      setError(requestError.message || 'Không thể cập nhật mật khẩu lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Account security" title={isSetup ? 'Thiết lập mật khẩu' : 'Đổi mật khẩu'} description={isSetup ? 'Xác thực email trước khi tạo mật khẩu đầu tiên.' : 'Nhập mật khẩu hiện tại để bảo vệ tài khoản.'} crop="security" footer={<Link className="font-bold underline" to="/account">Quay lại tài khoản</Link>}>
      <form className="max-w-md space-y-5" onSubmit={handleSubmit} noValidate>
        {isSetup ? (
          <div className="space-y-3">
            <button type="button" onClick={handleSendOtp} disabled={submitting} className="min-h-[44px] border border-[#121212] px-5 text-xs font-bold uppercase tracking-widest">{form.challengeId ? 'Gửi lại mã' : 'Gửi mã xác thực'}</button>
            {form.challengeId && <AuthField id="otp" label="Mã xác thực" inputMode="numeric" maxLength={6} required value={form.otp} onChange={handleChange} />}
          </div>
        ) : (
          <AuthField id="currentPassword" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={handleChange} />
        )}
        <AuthField id="newPassword" label="Mật khẩu mới" type="password" autoComplete="new-password" required value={form.newPassword} onChange={handleChange} />
        <AuthField id="newPasswordConfirmation" label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" required value={form.newPasswordConfirmation} onChange={handleChange} />
        {message && <p role="status" className="text-xs text-[#166534]">{message}</p>}
        {error && <p role="alert" className="border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">{error}</p>}
        <button type="submit" disabled={submitting} className="min-h-[46px] w-full bg-[#121212] px-5 text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-60">{submitting ? 'Đang cập nhật...' : isSetup ? 'Thiết lập mật khẩu' : 'Đổi mật khẩu'}</button>
      </form>
    </AuthShell>
  );
}
