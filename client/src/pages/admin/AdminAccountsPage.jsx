import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPageShell } from '../../components/admin/layout/AdminLayout';
import { StatusBadge } from '../../components/admin/common/AdminBadge';
import AdminPagination from '../../components/admin/common/AdminPagination';
import ConfirmDeleteModal from '../../components/admin/common/ConfirmDeleteModal';
import AdminAccountModal from '../../components/admin/accounts/AdminAccountModal';
import ResetPasswordModal from '../../components/admin/accounts/ResetPasswordModal';
import ChangePasswordModal from '../../components/admin/accounts/ChangePasswordModal';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminListAccounts, adminDeleteAccount } from '../../services/adminService';
import { adminErrorMessage, formatDate, isAdminUnauthorized } from '../../utils/adminHelpers';

const LIMIT = 20;

export default function AdminAccountsPage() {
  return (
    <AdminPageShell title="Quản lý Tài khoản Quản trị" breadcrumbs={[{ label: 'Tài khoản Quản trị' }]}>
      {({ addToast }) => <AccountsContent addToast={addToast} />}
    </AdminPageShell>
  );
}

function AccountsContent({ addToast }) {
  const { admin: currentAdmin, token, handleUnauthorized } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const q = searchParams.get('q') || '';
  const isActiveFilter = searchParams.get('isActive') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, account: null });
  const [resetPwModal, setResetPwModal] = useState({ open: false, account: null });
  const [changePwModal, setChangePwModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, account: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await adminListAccounts(token, {
        page, limit: LIMIT, q: q || undefined,
        isActive: isActiveFilter !== '' ? isActiveFilter : undefined,
        sort,
      });
      setAccounts(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      setLoadError(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, isActiveFilter, sort, handleUnauthorized]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSearch = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setSearchParams({ q: fd.get('q') || '', sort, isActive: isActiveFilter, page: 1 });
  };

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.set('page', '1');
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.account) return;
    setIsDeleting(true);
    try {
      await adminDeleteAccount(token, deleteModal.account.id);
      addToast('success', `Đã xóa tài khoản "${deleteModal.account.fullName}".`);
      setDeleteModal({ open: false, account: null });
      loadAccounts();
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      addToast('error', adminErrorMessage(err));
      setDeleteModal({ open: false, account: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const isSelf = (id) => id === currentAdmin?.id;

  return (
    <div>
      {/* Own password change button */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input name="q" defaultValue={q} placeholder="Tìm theo tên hoặc email..."
              className="flex-1 border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none" />
            <button type="submit" className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors">Tìm</button>
          </form>
          <div className="flex gap-2">
            <select value={isActiveFilter} onChange={(e) => updateParam('isActive', e.target.value)}
              className="border border-[#d1d5db] px-3 py-2 text-xs focus:outline-none bg-white">
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Ngừng</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setChangePwModal(true)}
            className="flex items-center gap-1.5 border border-[#121212] px-4 py-2 text-xs font-semibold text-[#121212] hover:bg-[#f3f4f6] transition-colors whitespace-nowrap">
            Đổi mật khẩu của tôi
          </button>
          <button type="button" onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#991b1b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7f1d1d] transition-colors whitespace-nowrap">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e0] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#9ca3af]">Đang tải...</div>
        ) : loadError ? (
          <div className="p-8 text-center text-sm text-[#dc2626]">{loadError}</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#9ca3af]">Không có tài khoản nào phù hợp.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e0] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Họ tên / Email</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Trạng thái</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, idx) => (
                <tr key={acc.id} className={`border-b border-[#f3f4f6] ${idx % 2 === 0 ? '' : 'bg-[#fafafa]'} hover:bg-[#f0f0ec] transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#121212]">{acc.fullName}</p>
                      {isSelf(acc.id) && (
                        <span className="inline-block border border-[#2563eb] bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#1d4ed8]">Bạn</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9ca3af] mt-0.5">{acc.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge isActive={acc.isActive} /></td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(acc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button type="button" onClick={() => setEditModal({ open: true, account: acc })}
                        className="text-xs font-medium text-[#374151] hover:text-[#121212] underline underline-offset-2">
                        Sửa
                      </button>
                      {!isSelf(acc.id) && (
                        <button type="button" onClick={() => setResetPwModal({ open: true, account: acc })}
                          className="text-xs font-medium text-[#6b7280] hover:text-[#374151] underline underline-offset-2">
                          Đặt lại MK
                        </button>
                      )}
                      {!isSelf(acc.id) && (
                        <button type="button" onClick={() => setDeleteModal({ open: true, account: acc })}
                          className="text-xs font-medium text-[#dc2626] hover:text-[#991b1b] underline underline-offset-2">
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AdminPagination pagination={pagination} onPageChange={(p) => updateParam('page', p)} />
      </div>

      {/* Modals */}
      <AdminAccountModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)}
        account={null} currentAdminId={currentAdmin?.id} token={token}
        onSaved={() => { addToast('success', 'Tài khoản quản trị đã được tạo.'); loadAccounts(); }} />

      <AdminAccountModal isOpen={editModal.open} onClose={() => setEditModal({ open: false, account: null })}
        account={editModal.account} currentAdminId={currentAdmin?.id} token={token}
        onSaved={() => { addToast('success', 'Tài khoản đã được cập nhật.'); setEditModal({ open: false, account: null }); loadAccounts(); }} />

      <ResetPasswordModal isOpen={resetPwModal.open} onClose={() => setResetPwModal({ open: false, account: null })}
        targetAdmin={resetPwModal.account} token={token}
        onSuccess={() => { addToast('success', 'Mật khẩu đã được đặt lại.'); setResetPwModal({ open: false, account: null }); }} />

      <ChangePasswordModal isOpen={changePwModal} onClose={() => setChangePwModal(false)} token={token}
        onSuccess={() => addToast('success', 'Mật khẩu cá nhân đã được đổi thành công.')} />

      <ConfirmDeleteModal isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, account: null })}
        onConfirm={handleDeleteConfirm} isSubmitting={isDeleting}
        title="Xóa tài khoản quản trị"
        description={`Xóa tài khoản "${deleteModal.account?.fullName}" (${deleteModal.account?.email})? Thao tác này không thể hoàn tác.`} />
    </div>
  );
}
