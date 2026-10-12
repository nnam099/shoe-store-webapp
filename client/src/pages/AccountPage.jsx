import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import { useAuth } from '../context/authContextValue';
import { validateAddress, validateFullName, validatePhone } from '../utils/authValidation';

function profileToForm(member) {
  return {
    fullName: member?.fullName || '',
    phone: member?.phone || '',
    address: member?.address || '',
  };
}

export default function AccountPage() {
  const { member, updateProfile } = useAuth();
  const [form, setForm] = useState(() => profileToForm(member));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      fullName: validateFullName(form.fullName),
      phone: validatePhone(form.phone),
      address: validateAddress(form.address),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSuccessMessage('');
    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      });
      setSuccessMessage('Thông tin tài khoản đã được cập nhật.');
    } catch (error) {
      setSubmitError(error.message || 'Không thể cập nhật hồ sơ lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="border-b border-[#d4d4ce] pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#991b1b]">Member account</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight">Tài khoản của tôi</h1>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)] gap-6 lg:gap-10">
        <aside className="border border-[#deded8] bg-[#121212] p-6 sm:p-8 text-white self-start">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Hồ sơ Member</p>
          <p className="mt-4 break-words text-lg font-bold">{member.fullName}</p>
          <p className="mt-1 break-all text-xs text-neutral-400">{member.email}</p>
          <div className="mt-7 border-t border-neutral-700 pt-6">
            <Link
              to="/account/orders"
              className="flex min-h-[44px] items-center text-xs font-extrabold uppercase tracking-widest underline underline-offset-4 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
            >
              Đơn hàng của tôi
            </Link>
            <Link
              to="/account/change-password"
              className="mt-2 flex min-h-[44px] items-center text-xs font-extrabold uppercase tracking-widest underline underline-offset-4 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
            >
              Đổi mật khẩu
            </Link>
            <Link
              to="/products"
              className="mt-5 flex min-h-[44px] w-full items-center justify-center border border-white bg-transparent px-4 py-3 text-center text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-[#121212] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        </aside>

        <section className="border border-[#deded8] bg-white p-6 sm:p-8 lg:p-10">
          <h2 className="text-xl font-black uppercase tracking-tight">Thông tin tài khoản</h2>
          <p className="mt-2 text-xs leading-5 text-[#737373]">Email được dùng để đăng nhập và không thể thay đổi.</p>

          <form className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-5" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="email"
              label="Email"
              type="email"
              value={member.email}
              readOnly
              className="sm:col-span-2"
            />
            <AuthField
              id="fullName"
              label="Họ và tên"
              autoComplete="name"
              required
              value={form.fullName}
              error={errors.fullName}
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
              id="address"
              label="Địa chỉ"
              autoComplete="street-address"
              value={form.address}
              error={errors.address}
              onChange={handleChange}
              multiline
              rows={4}
              className="sm:col-span-2"
            />

            {submitError && (
              <p role="alert" className="sm:col-span-2 border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
                {submitError}
              </p>
            )}
            {successMessage && (
              <p role="status" className="sm:col-span-2 border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs text-[#166534]">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="sm:col-span-2 sm:w-fit min-h-[46px] bg-[#121212] px-7 py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
