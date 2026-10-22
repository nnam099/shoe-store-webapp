import { useEffect, useState } from 'react';
import AdminModal from '../common/AdminModal';
import {
  adminCreateAccount, adminUpdateAccount,
} from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';

function initForm(account) {
  return {
    email: account?.email || '',
    fullName: account?.fullName || '',
    password: '',
    passwordConfirmation: '',
    isActive: account?.isActive ?? true,
  };
}

/**
 * AdminAccountModal — Create or edit an admin account.
 * Password fields only shown on create.
 */
export default function AdminAccountModal({ isOpen, onClose, account, currentAdminId, token, onSaved }) {
  const isEdit = Boolean(account);
  const [form, setForm] = useState(() => initForm(account));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setForm(initForm(account)); setError(''); }
  }, [isOpen, account]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Họ tên không được để trống.'); return; }
    if (!form.email.trim()) { setError('Email không được để trống.'); return; }
    if (!isEdit) {
      if (!form.password) { setError('Mật khẩu không được để trống.'); return; }
      if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
      if (form.password !== form.passwordConfirmation) { setError('Xác nhận mật khẩu không khớp.'); return; }
    }

    setIsSubmitting(true);
    setError('');
    try {
      let res;
      if (isEdit) {
        const payload = { email: form.email.trim(), fullName: form.fullName.trim(), isActive: form.isActive };
        res = await adminUpdateAccount(token, account.id, payload);
      } else {
        res = await adminCreateAccount(token, {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          passwordConfirmation: form.passwordConfirmation,
          isActive: form.isActive,
        });
      }
      onSaved(res?.admin || res);
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Sửa tài khoản quản trị' : 'Tạo tài khoản quản trị'} size="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs text-[#991b1b]" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="acc-fullname" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Họ và tên <span className="text-[#991b1b]">*</span>
          </label>
          <input id="acc-fullname" type="text" name="fullName" value={form.fullName} onChange={handleChange}
            required disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="Nguyễn Văn A" />
        </div>

        <div>
          <label htmlFor="acc-email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Email <span className="text-[#991b1b]">*</span>
          </label>
          <input id="acc-email" type="email" name="email" value={form.email} onChange={handleChange}
            required disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="admin@example.com" />
        </div>

        {/* Password fields — only on create */}
        {!isEdit && (
          <>
            <div>
              <label htmlFor="acc-pwd" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
                Mật khẩu <span className="text-[#991b1b]">*</span>
              </label>
              <input id="acc-pwd" type="password" name="password" value={form.password} onChange={handleChange}
                required disabled={isSubmitting} autoComplete="new-password"
                className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
                placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div>
              <label htmlFor="acc-pwd-confirm" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
                Xác nhận mật khẩu <span className="text-[#991b1b]">*</span>
              </label>
              <input id="acc-pwd-confirm" type="password" name="passwordConfirmation" value={form.passwordConfirmation}
                onChange={handleChange} required disabled={isSubmitting} autoComplete="new-password"
                className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors" />
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <input id="acc-active" type="checkbox" name="isActive" checked={form.isActive}
            onChange={handleChange} disabled={isSubmitting || (isEdit && account?.id === currentAdminId)}
            className="h-4 w-4 accent-[#121212]" />
          <label htmlFor="acc-active" className="text-sm text-[#374151]">
            Tài khoản hoạt động
            {isEdit && account?.id === currentAdminId && (
              <span className="ml-2 text-[11px] text-[#9ca3af]">(không thể tự vô hiệu hóa)</span>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-[#262626] disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
