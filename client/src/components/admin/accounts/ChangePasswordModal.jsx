import { useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminChangePassword } from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';

/**
 * ChangePasswordModal — Allows the current Admin to change their own password.
 * Uses POST /api/admin/auth/change-password.
 */
export default function ChangePasswordModal({ isOpen, onClose, token, onSuccess }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleClose = () => {
    setForm({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.newPasswordConfirmation) {
      setError('Vui lòng điền đầy đủ các trường mật khẩu.');
      return;
    }
    if (form.newPassword !== form.newPasswordConfirmation) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await adminChangePassword(token, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        newPasswordConfirmation: form.newPasswordConfirmation,
      });
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={handleClose} title="Đổi mật khẩu của tôi" size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs text-[#991b1b]" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cp-current" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Mật khẩu hiện tại
          </label>
          <input
            id="cp-current"
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="cp-new" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Mật khẩu mới
          </label>
          <input
            id="cp-new"
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="cp-confirm" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Xác nhận mật khẩu mới
          </label>
          <input
            id="cp-confirm"
            type="password"
            name="newPasswordConfirmation"
            value={form.newPasswordConfirmation}
            onChange={handleChange}
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-[#262626] disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
