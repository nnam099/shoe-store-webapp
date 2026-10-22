import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPageShell } from '../../components/admin/layout/AdminLayout';
import { StatusBadge } from '../../components/admin/common/AdminBadge';
import AdminPagination from '../../components/admin/common/AdminPagination';
import ConfirmDeleteModal from '../../components/admin/common/ConfirmDeleteModal';
import CategoryModal from '../../components/admin/categories/CategoryModal';
import { useAdminAuth } from '../../context/adminContextValue';
import { adminListCategories, adminDeleteCategory } from '../../services/adminService';
import { adminErrorMessage, formatDate, isAdminUnauthorized } from '../../utils/adminHelpers';

const LIMIT = 20;
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Tên A-Z' },
  { value: 'name-desc', label: 'Tên Z-A' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

export default function AdminCategoriesPage() {
  return (
    <AdminPageShell title="Quản lý Danh mục" breadcrumbs={[{ label: 'Danh mục' }]}>
      {({ addToast }) => <CategoriesContent addToast={addToast} />}
    </AdminPageShell>
  );
}

function CategoriesContent({ addToast }) {
  const { token, handleUnauthorized } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const q = searchParams.get('q') || '';
  const isActiveFilter = searchParams.get('isActive') || '';
  const sort = searchParams.get('sort') || 'name-asc';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, category: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await adminListCategories(token, {
        page, limit: LIMIT, q: q || undefined,
        isActive: isActiveFilter !== '' ? isActiveFilter : undefined,
        sort,
      });
      setCategories(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      setLoadError(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, isActiveFilter, sort, handleUnauthorized]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

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

  const handleSaved = () => {
    addToast('success', editingCategory ? 'Danh mục đã được cập nhật.' : 'Danh mục mới đã được tạo.');
    loadCategories();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.category) return;
    setIsDeleting(true);
    try {
      await adminDeleteCategory(token, deleteModal.category.id);
      addToast('success', `Đã xóa danh mục "${deleteModal.category.name}".`);
      setDeleteModal({ open: false, category: null });
      loadCategories();
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      addToast('error', adminErrorMessage(err));
      setDeleteModal({ open: false, category: null });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input name="q" defaultValue={q} placeholder="Tìm theo tên hoặc slug..."
            className="flex-1 border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none" />
          <button type="submit" className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors">
            Tìm
          </button>
        </form>
        <div className="flex gap-2">
          <select value={isActiveFilter} onChange={(e) => updateParam('isActive', e.target.value)}
            className="border border-[#d1d5db] px-3 py-2 text-xs focus:outline-none bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngừng</option>
          </select>
          <select value={sort} onChange={(e) => updateParam('sort', e.target.value)}
            className="border border-[#d1d5db] px-3 py-2 text-xs focus:outline-none bg-white">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" onClick={() => { setEditingCategory(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 bg-[#991b1b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7f1d1d] transition-colors whitespace-nowrap">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e0] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#9ca3af]">Đang tải...</div>
        ) : loadError ? (
          <div className="p-8 text-center text-sm text-[#dc2626]">{loadError}</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#9ca3af]">Không có danh mục nào phù hợp.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e0] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Tên / Slug</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Sản phẩm</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Trạng thái</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className={`border-b border-[#f3f4f6] ${idx % 2 === 0 ? '' : 'bg-[#fafafa]'} hover:bg-[#f0f0ec] transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#121212]">{cat.name}</p>
                    <p className="text-[11px] font-mono text-[#9ca3af] mt-0.5">{cat.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-[#374151]">{cat.productCount ?? 0}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge isActive={cat.isActive} /></td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(cat.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => { setEditingCategory(cat); setModalOpen(true); }}
                        className="text-xs font-medium text-[#374151] hover:text-[#121212] underline underline-offset-2 transition-colors">
                        Sửa
                      </button>
                      <button type="button" onClick={() => setDeleteModal({ open: true, category: cat })}
                        disabled={!cat.deletable}
                        title={!cat.deletable ? 'Danh mục đang có sản phẩm liên kết' : 'Xóa danh mục'}
                        className="text-xs font-medium text-[#dc2626] hover:text-[#991b1b] underline underline-offset-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AdminPagination pagination={pagination} onPageChange={(p) => updateParam('page', p)} />
      </div>

      <CategoryModal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        category={editingCategory} token={token} onSaved={handleSaved} />

      <ConfirmDeleteModal isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, category: null })}
        onConfirm={handleDeleteConfirm} isSubmitting={isDeleting}
        title="Xóa danh mục"
        description={`Bạn có chắc muốn xóa danh mục "${deleteModal.category?.name}"?`} />
    </div>
  );
}
