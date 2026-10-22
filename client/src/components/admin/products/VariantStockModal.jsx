import { useState } from 'react';
import AdminModal from '../common/AdminModal';
import { adminUpdateVariantStock } from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';

/**
 * VariantStockModal — Optimistic concurrency stock update.
 * Sends both new stock and expectedStock to guarantee no concurrent conflicts.
 */
export default function VariantStockModal({ isOpen, onClose, onSuccess, token, variant }) {
  const [stock, setStock] = useState(variant ? String(variant.stock) : '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!variant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const stockNum = parseInt(stock, 10);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      setError('Số lượng tồn kho phải là số nguyên không âm (>= 0).');
      return;
    }

    setLoading(true);
    try {
      await adminUpdateVariantStock(token, variant.id, {
        stock: stockNum,
        expectedStock: variant.stock,
      });
      onSuccess(`Đã cập nhật tồn kho Size ${variant.size}: ${stockNum}`);
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
      title={`Cập nhật tồn kho: Size ${variant.size}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        <div className="bg-[#f8f8f6] p-3 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#71717a]">Size:</span>
            <span className="font-semibold text-[#121212]">{variant.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717a]">Tồn kho hiện tại:</span>
            <span className="font-semibold text-[#121212]">{variant.stock}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
            Số lượng tồn kho mới <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            required
            autoFocus
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
          />
          <p className="mt-1 text-[11px] text-[#71717a]">
            Nhập số lượng thực tế trong kho. Hệ thống tự động kiểm tra xung đột tồn kho.
          </p>
        </div>

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
            Lưu tồn kho
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
