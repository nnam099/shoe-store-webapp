import { useEffect, useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminCreateColorway, adminUpdateColorway } from '../../../services/adminService';
import { adminErrorMessage, toSlug } from '../../../utils/adminHelpers';

const DEFAULT_COLOR_FAMILIES = [
  { slug: 'black', name: 'Đen' },
  { slug: 'white', name: 'Trắng / Kem' },
  { slug: 'grey', name: 'Xám / Bạc' },
  { slug: 'blue', name: 'Xanh dương / Navy' },
  { slug: 'green', name: 'Xanh lá / Rêu' },
  { slug: 'red', name: 'Đỏ' },
  { slug: 'pink-purple', name: 'Hồng / Tím' },
  { slug: 'orange-yellow', name: 'Cam / Vàng' },
  { slug: 'brown-beige', name: 'Nâu / Be' },
];

const COLOR_SWATCHES = {
  black: '#1a1a1a',
  white: '#f5f5f0',
  grey: '#9ca3af',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  'pink-purple': '#ec4899',
  'orange-yellow': '#f59e0b',
  'brown-beige': '#a16207',
};

function initForm(colorway) {
  return {
    name: colorway?.name || '',
    slug: colorway?.slug || '',
    colorFamilies: colorway?.colorFamilies || [],
    price: colorway?.price !== null && colorway?.price !== undefined ? String(colorway.price) : '',
    salePrice: colorway?.salePrice !== null && colorway?.salePrice !== undefined ? String(colorway.salePrice) : '',
    isActive: colorway?.isActive ?? false,
  };
}

export default function ColorwayModal({
  isOpen,
  onClose,
  colorway = null,
  productId,
  token,
  colorFamiliesList,
  onSuccess,
  onSaved,
}) {
  const isEdit = Boolean(colorway);
  const colorFamilies = (colorFamiliesList && colorFamiliesList.length > 0) ? colorFamiliesList : DEFAULT_COLOR_FAMILIES;

  const [form, setForm] = useState(() => initForm(colorway));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initForm(colorway));
      setError('');
    }
  }, [isOpen, colorway]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'name' && !isEdit) next.slug = toSlug(value);
      return next;
    });
    setError('');
  };

  const toggleColorFamily = (slug) => {
    setForm((prev) => ({
      ...prev,
      colorFamilies: prev.colorFamilies.includes(slug)
        ? prev.colorFamilies.filter((s) => s !== slug)
        : [...prev.colorFamilies, slug],
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Tên phối màu không được để trống.');
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug không được để trống.');
      return;
    }
    if (!form.colorFamilies || form.colorFamilies.length === 0) {
      setError('Phải chọn ít nhất một họ màu.');
      return;
    }

    const priceNum = parseFloat(form.price);
    if (!form.price || Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Giá niêm yết (gốc) phải là số dương lớn hơn 0.');
      return;
    }

    const salePriceNum = form.salePrice === '' ? null : parseFloat(form.salePrice);
    if (salePriceNum !== null) {
      if (Number.isNaN(salePriceNum) || salePriceNum < 0) {
        setError('Giá khuyến mãi phải là số không âm.');
        return;
      }
      if (salePriceNum >= priceNum) {
        setError('Giá khuyến mãi phải nhỏ hơn giá niêm yết.');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        colorFamilies: form.colorFamilies,
        price: priceNum,
        salePrice: salePriceNum,
        isActive: Boolean(form.isActive),
      };

      let res;
      if (isEdit) {
        res = await adminUpdateColorway(token, colorway.id, payload);
      } else {
        res = await adminCreateColorway(token, productId, payload);
      }

      const resultCw = res?.colorway || res;
      if (onSuccess) {
        onSuccess(isEdit ? 'Cập nhật phối màu thành công!' : 'Tạo phối màu mới thành công!');
      }
      if (onSaved) {
        onSaved(resultCw);
      }
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Sửa phối màu: ${colorway?.name}` : 'Thêm phối màu mới'}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="border border-[#fca5a5] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#991b1b] rounded" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cw-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1">
              Tên phối màu <span className="text-red-500">*</span>
            </label>
            <input
              id="cw-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
              placeholder="VD: Triple Black, White Red..."
            />
          </div>
          <div>
            <label htmlFor="cw-slug" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1">
              Slug phối màu <span className="text-red-500">*</span>
            </label>
            <input
              id="cw-slug"
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full border border-[#d1d5db] px-3 py-2 text-sm font-mono rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
              placeholder="triple-black"
            />
          </div>
        </div>

        {/* Price and Sale Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cw-price" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1">
              Giá niêm yết (VND) <span className="text-red-500">*</span>
            </label>
            <input
              id="cw-price"
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              disabled={isSubmitting}
              className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
              placeholder="VD: 2500000"
            />
          </div>
          <div>
            <label htmlFor="cw-sale" className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1">
              Giá khuyến mãi (VND)
            </label>
            <input
              id="cw-sale"
              type="number"
              name="salePrice"
              value={form.salePrice}
              onChange={handleChange}
              min="0"
              step="1000"
              disabled={isSubmitting}
              className="w-full border border-[#d1d5db] px-3 py-2 text-sm rounded focus:border-[#121212] focus:outline-none disabled:bg-[#f9fafb] transition-colors"
              placeholder="Để trống nếu không giảm"
            />
          </div>
        </div>

        {/* Color Families Selection */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
            Họ màu (Color Families) <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colorFamilies.map((cf) => {
              const selected = form.colorFamilies.includes(cf.slug);
              return (
                <button
                  key={cf.slug}
                  type="button"
                  onClick={() => toggleColorFamily(cf.slug)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors ${
                    selected
                      ? 'border-[#121212] bg-[#121212] text-white shadow-xs'
                      : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#121212]'
                  } disabled:opacity-50`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: COLOR_SWATCHES[cf.slug] || '#ccc' }}
                  />
                  {cf.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="pt-2 border-t border-[#e5e5e0]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              id="cw-active"
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-4 w-4 rounded accent-[#121212]"
            />
            <span className="text-xs font-medium text-[#121212]">
              Kích hoạt phối màu này (Active)
            </span>
          </label>
          <p className="text-[11px] text-[#71717a] pl-6 mt-0.5">
            Phối màu mới tạo phải ở trạng thái nháp. Kích hoạt yêu cầu đủ tối thiểu 3 ảnh, 1 ảnh đại diện và 1 kích cỡ.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e5e0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] rounded transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold bg-[#121212] text-white hover:bg-black rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
              </svg>
            )}
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm phối màu'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
