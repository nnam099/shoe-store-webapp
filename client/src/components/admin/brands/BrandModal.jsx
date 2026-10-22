import { useEffect, useState } from 'react';
import AdminModal from '../common/AdminModal';
import {
  adminCreateBrand, adminUpdateBrand,
  adminUploadBrandLogo, adminDeleteBrandLogo,
} from '../../../services/adminService';
import { adminErrorMessage, toSlug } from '../../../utils/adminHelpers';
import { getAssetUrl } from '../../../config/site';

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function initForm(brand) {
  return {
    name: brand?.name || '',
    slug: brand?.slug || '',
    isActive: brand?.isActive ?? true,
  };
}

export default function BrandModal({ isOpen, onClose, brand, token, onSaved }) {
  const isEdit = Boolean(brand);
  const [form, setForm] = useState(() => initForm(brand));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoError, setLogoError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initForm(brand));
      setError('');
      setLogoFile(null);
      setLogoPreview(null);
      setLogoError('');
    }
  }, [isOpen, brand]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'name' && !isEdit) next.slug = toSlug(value);
      return next;
    });
    setError('');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLogoError('Chỉ hỗ trợ JPEG, PNG, WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Ảnh logo vượt quá 8 MB.');
      return;
    }
    setLogoError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tên thương hiệu không được để trống.'); return; }
    if (!form.slug.trim()) { setError('Slug không được để trống.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      let savedBrand;
      if (isEdit) {
        const res = await adminUpdateBrand(token, brand.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          isActive: form.isActive,
        });
        savedBrand = res?.brand || res;
      } else {
        const res = await adminCreateBrand(token, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          isActive: form.isActive,
        });
        savedBrand = res?.brand || res;
      }

      // Upload logo if a file was selected
      if (logoFile && savedBrand?.id) {
        setIsUploadingLogo(true);
        try {
          const logoRes = await adminUploadBrandLogo(token, savedBrand.id, logoFile);
          savedBrand = logoRes?.brand || logoRes || savedBrand;
        } catch (logoErr) {
          setLogoError(`Logo đã lưu nhưng upload thất bại: ${adminErrorMessage(logoErr)}`);
        } finally {
          setIsUploadingLogo(false);
        }
      }

      onSaved(savedBrand);
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!brand?.id) return;
    setIsDeletingLogo(true);
    setLogoError('');
    try {
      const res = await adminDeleteBrandLogo(token, brand.id);
      onSaved(res?.brand || res);
    } catch (err) {
      setLogoError(adminErrorMessage(err));
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const currentLogoUrl = logoPreview || (brand?.logoUrl ? getAssetUrl(brand.logoUrl) : null);

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'} size="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs text-[#991b1b]" role="alert">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="brand-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Tên thương hiệu <span className="text-[#991b1b]">*</span>
          </label>
          <input
            id="brand-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="Ví dụ: Nike"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="brand-slug" className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
            Slug (URL) <span className="text-[#991b1b]">*</span>
          </label>
          <input
            id="brand-slug"
            type="text"
            name="slug"
            value={form.slug}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="w-full border border-[#d1d5db] px-3 py-2 text-sm font-mono focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
            placeholder="vd: nike"
          />
          <p className="mt-1 text-[11px] text-[#9ca3af]">Chỉ chữ thường, số và dấu gạch ngang. Slug phải là duy nhất.</p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            id="brand-active"
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-4 w-4 accent-[#121212]"
          />
          <label htmlFor="brand-active" className="text-sm text-[#374151]">Kích hoạt thương hiệu</label>
        </div>

        {/* Logo upload */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-2">Logo thương hiệu</p>
          {currentLogoUrl && (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={currentLogoUrl}
                alt="Logo preview"
                className="h-12 w-24 object-contain border border-[#e5e5e0] bg-[#f9fafb] p-1"
              />
              {isEdit && brand?.logoUrl && !logoPreview && (
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={isDeletingLogo || isSubmitting}
                  className="text-[11px] text-[#dc2626] hover:underline disabled:opacity-50"
                >
                  {isDeletingLogo ? 'Đang xóa...' : 'Xóa logo'}
                </button>
              )}
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                  className="text-[11px] text-[#6b7280] hover:underline"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          )}
          {logoError && <p className="mb-2 text-xs text-[#dc2626]">{logoError}</p>}
          <label className="flex cursor-pointer items-center gap-2 border border-dashed border-[#d1d5db] px-4 py-3 hover:bg-[#f9fafb] transition-colors">
            <svg className="h-4 w-4 text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-[#6b7280]">
              {logoFile ? logoFile.name : 'Chọn ảnh logo (JPEG/PNG/WebP, tối đa 8 MB)'}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </label>
          {isUploadingLogo && <p className="mt-1 text-xs text-[#6b7280]">Đang tải logo lên...</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-[#262626] disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
