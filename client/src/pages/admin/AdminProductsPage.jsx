import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminPageShell } from '../../components/admin/layout/AdminLayout';
import { StatusBadge, FeaturedBadge } from '../../components/admin/common/AdminBadge';
import AdminPagination from '../../components/admin/common/AdminPagination';
import ConfirmDeleteModal from '../../components/admin/common/ConfirmDeleteModal';
import { useAdminAuth } from '../../context/adminContextValue';
import {
  adminListProducts, adminDeleteProduct,
  adminListBrands, adminListCategories,
} from '../../services/adminService';
import { adminErrorMessage, formatDate, isAdminUnauthorized } from '../../utils/adminHelpers';

const LIMIT = 20;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'updated-desc', label: 'Cập nhật gần nhất' },
  { value: 'name-asc', label: 'Tên A-Z' },
  { value: 'name-desc', label: 'Tên Z-A' },
  { value: 'oldest', label: 'Cũ nhất' },
];

export default function AdminProductsPage() {
  return (
    <AdminPageShell title="Quản lý Sản phẩm" breadcrumbs={[{ label: 'Sản phẩm' }]}>
      {({ addToast }) => <ProductsContent addToast={addToast} />}
    </AdminPageShell>
  );
}

function ProductsContent({ addToast }) {
  const { token, handleUnauthorized } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const q = searchParams.get('q') || '';
  const isActiveFilter = searchParams.get('isActive') || '';
  const isFeaturedFilter = searchParams.get('isFeatured') || '';
  const brandFilter = searchParams.get('brandId') || '';
  const categoryFilter = searchParams.get('categoryId') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load filter options once
  useEffect(() => {
    Promise.all([
      adminListBrands(token, { limit: 100, sort: 'name-asc' }).catch(() => ({ items: [] })),
      adminListCategories(token, { limit: 100, sort: 'name-asc' }).catch(() => ({ items: [] })),
    ]).then(([br, ca]) => {
      setBrands(br?.items || []);
      setCategories(ca?.items || []);
    });
  }, [token]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await adminListProducts(token, {
        page, limit: LIMIT, q: q || undefined,
        isActive: isActiveFilter !== '' ? isActiveFilter : undefined,
        isFeatured: isFeaturedFilter !== '' ? isFeaturedFilter : undefined,
        brandId: brandFilter || undefined,
        categoryId: categoryFilter || undefined,
        sort,
      });
      setProducts(data?.items || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      setLoadError(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, page, q, isActiveFilter, isFeaturedFilter, brandFilter, categoryFilter, sort, handleUnauthorized]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const val = fd.get('q') || '';
      if (val) next.set('q', val); else next.delete('q');
      next.set('page', '1');
      return next;
    });
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
    if (!deleteModal.product) return;
    setIsDeleting(true);
    try {
      await adminDeleteProduct(token, deleteModal.product.id);
      addToast('success', `Đã xóa sản phẩm "${deleteModal.product.name}".`);
      setDeleteModal({ open: false, product: null });
      loadProducts();
    } catch (err) {
      if (isAdminUnauthorized(err)) { handleUnauthorized(); return; }
      addToast('error', adminErrorMessage(err));
      setDeleteModal({ open: false, product: null });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input name="q" defaultValue={q} placeholder="Tìm theo tên hoặc slug..."
              className="flex-1 border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none" />
            <button type="submit" className="bg-[#121212] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626] transition-colors">Tìm</button>
          </form>
          <Link to="/admin/products/new"
            className="flex items-center gap-1.5 bg-[#991b1b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7f1d1d] transition-colors whitespace-nowrap">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm sản phẩm
          </Link>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <select value={isActiveFilter} onChange={(e) => updateParam('isActive', e.target.value)}
            className="border border-[#d1d5db] px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang bán</option>
            <option value="false">Bản nháp / Ngừng</option>
          </select>
          <select value={isFeaturedFilter} onChange={(e) => updateParam('isFeatured', e.target.value)}
            className="border border-[#d1d5db] px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">Tất cả</option>
            <option value="true">Nổi bật</option>
            <option value="false">Không nổi bật</option>
          </select>
          <select value={brandFilter} onChange={(e) => updateParam('brandId', e.target.value)}
            className="border border-[#d1d5db] px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">Tất cả thương hiệu</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => updateParam('categoryId', e.target.value)}
            className="border border-[#d1d5db] px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={(e) => updateParam('sort', e.target.value)}
            className="border border-[#d1d5db] px-3 py-1.5 text-xs focus:outline-none bg-white">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e0] overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#9ca3af]">Đang tải...</div>
        ) : loadError ? (
          <div className="p-8 text-center text-sm text-[#dc2626]">{loadError}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#9ca3af] mb-3">Không có sản phẩm nào phù hợp.</p>
            <Link to="/admin/products/new" className="text-xs font-semibold text-[#991b1b] hover:underline">
              + Tạo sản phẩm đầu tiên
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#e5e5e0] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Thương hiệu</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Phối màu</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Đánh giá</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Trạng thái</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Cập nhật</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => {
                const hasIssues = product.readinessIssues?.length > 0;
                return (
                  <tr key={product.id} className={`border-b border-[#f3f4f6] ${idx % 2 === 0 ? '' : 'bg-[#fafafa]'} hover:bg-[#f0f0ec] transition-colors`}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${product.id}`}
                        className="font-semibold text-[#121212] hover:text-[#991b1b] transition-colors">
                        {product.name}
                      </Link>
                      <p className="text-[11px] font-mono text-[#9ca3af] mt-0.5">{product.slug}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.isFeatured && <FeaturedBadge />}
                        {!product.isActive && hasIssues && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-medium text-[#854d0e]">
                            ⚠ {product.readinessIssues.length} vấn đề
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{product.brand?.name || '—'}</td>
                    <td className="px-4 py-3 text-center text-sm text-[#374151]">{product.colorways?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-[#374151]">{product.reviewCount ?? 0}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge isActive={product.isActive} /></td>
                    <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(product.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/products/${product.id}`}
                          className="text-xs font-medium text-[#374151] hover:text-[#121212] underline underline-offset-2 transition-colors">
                          Chỉnh sửa
                        </Link>
                        <button type="button"
                          onClick={() => setDeleteModal({ open: true, product })}
                          disabled={!product.deletable}
                          title={!product.deletable ? 'Sản phẩm đã có đơn hàng/đánh giá' : 'Xóa sản phẩm'}
                          className="text-xs font-medium text-[#dc2626] hover:text-[#991b1b] underline underline-offset-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <AdminPagination pagination={pagination} onPageChange={(p) => updateParam('page', p)} />
      </div>

      <ConfirmDeleteModal isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        onConfirm={handleDeleteConfirm} isSubmitting={isDeleting}
        title="Xóa sản phẩm"
        description={`Xóa sản phẩm "${deleteModal.product?.name}" và toàn bộ phối màu, ảnh liên kết? Không thể hoàn tác.`} />
    </div>
  );
}
