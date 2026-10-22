import { useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminCreateVariant, adminUpdateVariant } from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';

/**
 * VariantModal — Create or edit size for a Colorway variant.
 * In create mode, accepts size and initial stock.
 * In edit mode, accepts size (backend only allows size change if not used in orders).
 */
export default function VariantModal({ isOpen, onClose, onSuccess, token, colorwayId, variant = null }) {
  const isEdit = Boolean(variant);
  const [size, setSize] = useState(variant ? variant.size : '');
  const [stock, setStock] = useState(variant ? String(variant.stock) : '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedSize = size.trim();
    if (!trimmedSize) {
      setError('Vui lòng nhập Size.');
      return;
    }
    if (trimmedSize.length > 10) {
      setError('Size không được vượt quá 10 ký tự.');
      return;
    }

    if (!isEdit) {
      const stockNum = parseInt(stock, 10);
      if (Number.isNaN(stockNum) || stockNum < 0) {
        setError('Tồn kho phải là số nguyên không âm (>= 0).');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        await adminUpdateVariant(token, variant.id, { size: trimmedSize });
      } else {
        await adminCreateVariant(token, colorwayId, {
          size: trimmedSize,
          stock: parseInt(stock, 10),
        });
      }
      onSuccess(isEdit ? 'Cập nhật size thành công!' : 'Thêm size thành công!');
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Chỉnh sửa Size: ${variant.size}` : 'Thêm Size mới'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
            Size (Kích thước) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={10}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="VD: 39, 40, 41, 42.5..."
            className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
          />
          <p className="mt-1 text-[11px] text-[#71717a]">
            Tối đa 10 ký tự (chuỗi, có thể bao gồm nửa size như 40.5).
          </p>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
              Tồn kho ban đầu <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-[#71717a]">
              Số lượng nguyên không âm (&ge; 0).
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-[#e5e5e0]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-[#71717a] hover:text-[#121212] transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-black rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
              </svg>
            )}
            {isEdit ? 'Lưu thay đổi' : 'Tạo Size'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
