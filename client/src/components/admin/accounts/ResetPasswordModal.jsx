import { useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminResetAccountPassword } from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';

/**
 * ResetPasswordModal — Reset another admin's password (not own account).
 * Uses POST /api/admin/accounts/:adminId/reset-password
 */
export default function ResetPasswordModal({ isOpen, onClose, targetAdmin, token, onSuccess }) {
  const [form, setForm] = useState({ newPassword: '', newPasswordConfirmation: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setForm({ newPassword: '', newPasswordConfirmation: '' });
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.newPassword) { setError('Mật khẩu mới không được để trống.'); return; }
    if (form.newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (form.newPassword !== form.newPasswordConfirmation) { setError('Xác nhận mật khẩu không khớp.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      await adminResetAccountPassword(token, targetAdmin.id, {
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
    <AdminModal isOpen={isOpen} onClose={handleClose} title={`Đặt lại mật khẩu — ${targetAdmin?.fullName || ''}`} size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs text-[#991b1b]" role="alert">
            {error}
          </div>
        )}
        <p className="text-xs text-[#6b7280]">
          Đặt lại mật khẩu cho tài khoản <span className="font-semibold text-[#374151]">{targetAdmin?.email}</span>.
          Tài khoản này sẽ bị đăng xuất khỏi các phiên làm việc hiện tại.
        </p>

        <div>
          <label htmlFor="rp-new" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Mật khẩu mới <span className="text-[#991b1b]">*</span>
          </label>
          <input id="rp-new" type="password" name="newPassword" value={form.newPassword}
            onChange={handleChange} required disabled={isSubmitting} autoComplete="new-password"
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="Tối thiểu 6 ký tự" />
        </div>

        <div>
          <label htmlFor="rp-confirm" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Xác nhận mật khẩu mới <span className="text-[#991b1b]">*</span>
          </label>
          <input id="rp-confirm" type="password" name="newPasswordConfirmation" value={form.newPasswordConfirmation}
            onChange={handleChange} required disabled={isSubmitting} autoComplete="new-password"
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold bg-[#991b1b] text-white hover:bg-[#7f1d1d] disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
