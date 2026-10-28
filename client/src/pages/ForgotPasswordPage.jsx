import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/authContextValue';
import { validateEmail } from '../utils/authValidation';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await forgotPassword({ email: email.trim() });
      setMessage(result?.message || 'Nếu tài khoản phù hợp tồn tại, STEP/LAB đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (requestError) {
      setError(requestError.message || 'Không thể gửi yêu cầu lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Quên mật khẩu"
      description="Nhận liên kết đặt lại mật khẩu dùng một lần qua email."
      crop="passwordResetStepOne"
      footer={<Link className="font-bold text-[#121212] underline underline-offset-4" to="/login">Quay lại đăng nhập</Link>}
    >
      <div className="max-w-md">
        <h1 className="text-3xl font-black tracking-tight">Quên mật khẩu</h1>
        <p className="mt-2 text-xs leading-5 text-[#737373]">Thông báo luôn giống nhau để bảo vệ thông tin tài khoản.</p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthField
            id="email" label="Email" type="email" autoComplete="email" required
            value={email} error={error} onChange={(event) => { setEmail(event.target.value); setError(''); }}
          />
          {message && <p role="status" className="border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs text-[#166534]">{message}</p>}
          <button type="submit" disabled={submitting} className="min-h-[46px] w-full bg-[#121212] px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-[#991b1b] disabled:opacity-60">
            {submitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
