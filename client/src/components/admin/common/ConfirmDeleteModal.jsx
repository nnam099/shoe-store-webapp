import AdminModal from './AdminModal';

/**
 * ConfirmDeleteModal — Standard destructive action confirmation dialog.
 */
export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, isSubmitting, title, description }) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={title || 'Xác nhận xóa'} danger size="sm">
      <p className="text-sm text-[#374151] leading-relaxed">
        {description || 'Bạn có chắc chắn muốn thực hiện thao tác này không? Hành động này không thể hoàn tác.'}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold bg-[#991b1b] text-white hover:bg-[#7f1d1d] disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
        </button>
      </div>
    </AdminModal>
  );
}
