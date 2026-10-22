import { useEffect, useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminCreateCategory, adminUpdateCategory } from '../../../services/adminService';
import { adminErrorMessage, toSlug } from '../../../utils/adminHelpers';

function initForm(category) {
  return {
    name: category?.name || '',
    slug: category?.slug || '',
    isActive: category?.isActive ?? true,
  };
}

export default function CategoryModal({ isOpen, onClose, category, token, onSaved }) {
  const isEdit = Boolean(category);
  const [form, setForm] = useState(() => initForm(category));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setForm(initForm(category)); setError(''); }
  }, [isOpen, category]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'name' && !isEdit) next.slug = toSlug(value);
      return next;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tên danh mục không được để trống.'); return; }
    if (!form.slug.trim()) { setError('Slug không được để trống.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      let res;
      if (isEdit) {
        res = await adminUpdateCategory(token, category.id, { name: form.name.trim(), slug: form.slug.trim(), isActive: form.isActive });
      } else {
        res = await adminCreateCategory(token, { name: form.name.trim(), slug: form.slug.trim(), isActive: form.isActive });
      }
      onSaved(res?.category || res);
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Sửa danh mục' : 'Thêm danh mục mới'} size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs text-[#991b1b]" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cat-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Tên danh mục <span className="text-[#991b1b]">*</span>
          </label>
          <input id="cat-name" type="text" name="name" value={form.name} onChange={handleChange}
            required disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="Ví dụ: Lifestyle" />
        </div>

        <div>
          <label htmlFor="cat-slug" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Slug <span className="text-[#991b1b]">*</span>
          </label>
          <input id="cat-slug" type="text" name="slug" value={form.slug} onChange={handleChange}
            required disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm font-mono focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="vd: lifestyle" />
          <p className="mt-1 text-[11px] text-[#9ca3af]">Slug phải là duy nhất trong hệ thống.</p>
        </div>

        <div className="flex items-center gap-3">
          <input id="cat-active" type="checkbox" name="isActive" checked={form.isActive}
            onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 accent-[#121212]" />
          <label htmlFor="cat-active" className="text-sm text-[#374151]">Kích hoạt danh mục</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-[#262626] disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
