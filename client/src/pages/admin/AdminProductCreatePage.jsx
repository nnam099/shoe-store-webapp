import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageShell } from '../../components/admin/layout/AdminLayout';
import { useAdminAuth } from '../../context/adminContextValue';
import {
  adminCreateProduct,
  adminListBrands,
  adminListCategories,
} from '../../services/adminService';
import { adminErrorMessage, isAdminUnauthorized, toSlug } from '../../utils/adminHelpers';

export default function AdminProductCreatePage() {
  return (
    <AdminPageShell
      title="Tạo sản phẩm mới"
      breadcrumbs={[{ label: 'Sản phẩm', to: '/admin/products' }, { label: 'Tạo mới' }]}
    >
      {({ addToast }) => <ProductCreateContent addToast={addToast} />}
    </AdminPageShell>
  );
}

function ProductCreateContent({ addToast }) {
  const { token, handleUnauthorized } = useAdminAuth();
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    brandId: '',
    description: '',
    isFeatured: false,
    categoryIds: [],
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      adminListBrands(token, { limit: 100 }),
      adminListCategories(token, { limit: 100 }),
    ])
      .then(([brandRes, catRes]) => {
        if (!active) return;
        const brandList = brandRes?.items || brandRes?.brands || [];
        const catList = catRes?.items || catRes?.categories || [];
        setBrands(brandList);
        setCategories(catList);
      })
      .catch((err) => {
        if (!active) return;
        if (isAdminUnauthorized(err)) {
          handleUnauthorized();
        } else {
          setError(adminErrorMessage(err));
        }
      })
      .finally(() => {
        if (active) setIsLoadingTaxonomy(false);
      });

    return () => {
      active = false;
    };
  }, [token, handleUnauthorized]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'name') next.slug = toSlug(value);
      return next;
    });
    setError('');
  };

  const handleCategoryToggle = (categoryId) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Tên sản phẩm không được để trống.');
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug không được để trống.');
      return;
    }
    if (!form.brandId) {
      setError('Vui lòng chọn Thương hiệu.');
      return;
    }
    if (!form.categoryIds || form.categoryIds.length === 0) {
      setError('Vui lòng chọn ít nhất một Danh mục.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const data = await adminCreateProduct(token, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        brandId: parseInt(form.brandId, 10),
        description: form.description.trim() || null,
        isFeatured: Boolean(form.isFeatured),
        categoryIds: form.categoryIds.map((id) => parseInt(id, 10)),
        isActive: false, // Draft per business rules
      });
      const product = data?.product || data;
      addToast('success', `Sản phẩm "${product.name}" đã được tạo ở trạng thái bản nháp.`);
      navigate(`/admin/products/${product.id}`);
    } catch (err) {
      if (isAdminUnauthorized(err)) {
        handleUnauthorized();
        return;
      }
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-white border border-[#e5e5e0] p-6 rounded shadow-xs">
        <div className="mb-5 border border-[#fde68a] bg-[#fffbeb] px-4 py-3 rounded">
          <p className="text-xs text-[#92400e] leading-relaxed">
            <strong>Quy tắc nghiệp vụ:</strong> Sản phẩm mới bắt buộc tạo ở trạng thái <strong>Bản nháp (Draft - Inactive)</strong>.
            Sau khi tạo thông tin cơ bản, bạn sẽ được chuyển đến trang chi tiết để thêm <strong>Phối màu (Colorway)</strong>, tải <strong>Ảnh</strong>, thiết lập <strong>Kích cỡ & Tồn kho</strong>, và định <strong>Giá bán</strong> trước khi kích hoạt.
          </p>
        </div>

        {isLoadingTaxonomy ? (
          <div className="py-12 text-center text-xs text-[#71717a] flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-[#121212]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
            </svg>
            Đang tải dữ liệu Thương hiệu và Danh mục...
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div className="border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-xs text-[#991b1b] rounded" role="alert">
                {error}
              </div>
            )}

            {/* Name + Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="p-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
                  placeholder="Ví dụ: Nike Air Max 90"
                />
              </div>
              <div>
                <label htmlFor="p-slug" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                  Đường dẫn (Slug) <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-slug"
                  type="text"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full border border-[#d1d5db] px-3 py-2 text-sm font-mono rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
                  placeholder="nike-air-max-90"
                />
              </div>
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="p-brand" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Thương hiệu <span className="text-red-500">*</span>
              </label>
              <select
                id="p-brand"
                name="brandId"
                value={form.brandId}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none bg-white disabled:bg-[#f9fafb] transition-colors"
              >
                <option value="">-- Chọn thương hiệu --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {!b.isActive ? '(Ngừng hoạt động)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories multi-select */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Danh mục <span className="text-red-500">*</span>
              </label>
              {categories.length === 0 ? (
                <p className="text-xs text-[#71717a]">Chưa có danh mục nào trong hệ thống.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map((cat) => {
                    const isChecked = form.categoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-xs rounded transition-colors ${
                          isChecked
                            ? 'border-[#121212] bg-[#121212] text-white font-medium'
                            : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#121212]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => handleCategoryToggle(cat.id)}
                        />
                        {isChecked && (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {cat.name} {!cat.isActive ? '(Ngừng)' : ''}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="p-desc" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Mô tả sản phẩm
              </label>
              <textarea
                id="p-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                disabled={isSubmitting}
                className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors resize-none"
                placeholder="Mô tả thông tin chi tiết, công nghệ, chất liệu..."
              />
            </div>

            {/* Featured toggle */}
            <div className="pt-2 border-t border-[#e5e5e0]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  id="p-featured"
                  type="checkbox"
                  name="isFeatured"
                  checked={form.isFeatured}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded accent-[#121212]"
                />
                <span className="text-xs font-medium text-[#121212]">
                  Sản phẩm nổi bật (Hiển thị tại mục Featured trên Trang chủ)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e5e0]">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] rounded transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-black rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                )}
                {isSubmitting ? 'Đang tạo...' : 'Tạo bản nháp sản phẩm'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
