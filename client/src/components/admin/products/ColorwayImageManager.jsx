import { useState } from 'react';
import {
  adminUploadColorwayImage,
  adminDeleteImage,
  adminReorderColorwayImages,
} from '../../../services/adminService';
import { adminErrorMessage } from '../../../utils/adminHelpers';
import { getAssetUrl } from '../../../config/site';

const MAX_IMAGES = 4;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * ColorwayImageManager — Upload, reorder, delete images and select thumbnail for a colorway.
 * Conforms strictly to backend contract: displayOrder (1..4), thumbnailImageId, images array.
 */
export default function ColorwayImageManager({
  colorway,
  colorwayId,
  images: propImages,
  token,
  onSuccess,
  onUpdated,
  onError,
}) {
  const activeColorwayId = colorway?.id || colorwayId;
  const images = propImages || colorway?.images || [];

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  const sortedImages = [...images].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const notifySuccess = (msg) => {
    if (onSuccess) onSuccess(msg);
    if (onUpdated) onUpdated();
  };

  const notifyError = (msg) => {
    setUploadError(msg);
    if (onError) onError(msg);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      notifyError('Chỉ hỗ trợ tệp định dạng JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      notifyError('Dung lượng ảnh vượt quá 8 MB.');
      return;
    }
    if (images.length >= MAX_IMAGES) {
      notifyError(`Mỗi phối màu chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setUploadError('');
    setIsUploading(true);
    try {
      const nextDisplayOrder = images.length + 1; // 1-indexed (1..4)
      const isThumbnail = images.length === 0; // First image automatically becomes thumbnail
      await adminUploadColorwayImage(token, activeColorwayId, file, nextDisplayOrder, isThumbnail);
      notifySuccess('Tải lên ảnh thành công!');
    } catch (err) {
      notifyError(adminErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    setDeletingId(imageId);
    setUploadError('');
    try {
      await adminDeleteImage(token, imageId);
      notifySuccess('Đã xóa ảnh thành công.');
    } catch (err) {
      notifyError(adminErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // Adjacent swap with continuous 1-based displayOrder sequence
  const handleMove = async (index, direction) => {
    if (isReordering) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedImages.length) return;

    const newImages = [...sortedImages];
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];

    const currentThumbnail = newImages.find((img) => img.isThumbnail) || newImages[0];
    const payload = {
      images: newImages.map((img, i) => ({
        id: img.id,
        displayOrder: i + 1, // Must be continuous sequence 1..N
      })),
      thumbnailImageId: currentThumbnail.id,
    };

    setIsReordering(true);
    setUploadError('');
    try {
      await adminReorderColorwayImages(token, activeColorwayId, payload);
      notifySuccess('Đã cập nhật thứ tự ảnh.');
    } catch (err) {
      notifyError(adminErrorMessage(err));
    } finally {
      setIsReordering(false);
    }
  };

  const handleSetThumbnail = async (imageId) => {
    if (isReordering) return;
    const payload = {
      images: sortedImages.map((img, i) => ({
        id: img.id,
        displayOrder: i + 1,
      })),
      thumbnailImageId: imageId,
    };

    setIsReordering(true);
    setUploadError('');
    try {
      await adminReorderColorwayImages(token, activeColorwayId, payload);
      notifySuccess('Đã cập nhật ảnh đại diện (Thumbnail).');
    } catch (err) {
      notifyError(adminErrorMessage(err));
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
            Bộ sưu tập ảnh ({images.length}/{MAX_IMAGES})
          </h5>
          <p className="text-[11px] text-[#71717a]">
            Cần từ 3 đến 4 ảnh và 1 ảnh đại diện để phối màu đủ điều kiện xuất bản.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="border border-[#fca5a5] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#991b1b] rounded" role="alert">
          {uploadError}
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sortedImages.map((img, idx) => (
          <div
            key={img.id}
            className={`relative group border aspect-square overflow-hidden bg-[#f9fafb] rounded ${
              img.isThumbnail ? 'border-[#121212] ring-2 ring-[#121212]' : 'border-[#e5e5e0]'
            }`}
          >
            <img
              src={getAssetUrl(img.imageUrl)}
              alt={`Ảnh ${idx + 1}`}
              className="h-full w-full object-cover"
            />

            {/* Thumbnail badge */}
            {img.isThumbnail && (
              <div className="absolute top-1.5 left-1.5 bg-[#121212] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white rounded">
                Ảnh đại diện
              </div>
            )}

            {/* Order badge */}
            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] text-white font-mono rounded">
              #{idx + 1}
            </div>

            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0 || isReordering}
                  className="h-7 w-7 bg-white/90 hover:bg-white disabled:opacity-30 rounded flex items-center justify-center text-[#121212] transition-colors"
                  title="Di chuyển lên trước"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === sortedImages.length - 1 || isReordering}
                  className="h-7 w-7 bg-white/90 hover:bg-white disabled:opacity-30 rounded flex items-center justify-center text-[#121212] transition-colors"
                  title="Di chuyển về sau"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  className="h-7 w-7 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded flex items-center justify-center text-white transition-colors"
                  title="Xóa ảnh này"
                >
                  {deletingId === img.id ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>

              {!img.isThumbnail && (
                <button
                  type="button"
                  onClick={() => handleSetThumbnail(img.id)}
                  disabled={isReordering}
                  className="px-2 py-1 text-[10px] font-semibold bg-white text-[#121212] hover:bg-[#f8f8f6] rounded transition-colors disabled:opacity-50"
                >
                  Đặt làm đại diện
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload slot */}
        {images.length < MAX_IMAGES && (
          <label
            className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded transition-colors cursor-pointer ${
              isUploading
                ? 'border-[#d1d5db] bg-[#f9fafb] cursor-wait'
                : 'border-[#d1d5db] hover:border-[#121212] hover:bg-[#f3f4f6]'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5">
                <svg className="h-5 w-5 animate-spin text-[#121212]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                </svg>
                <span className="text-[10px] text-[#71717a]">Đang tải...</span>
              </div>
            ) : (
              <>
                <svg className="h-6 w-6 text-[#9ca3af] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] font-medium text-[#71717a] text-center px-1">
                  Thêm ảnh ({images.length}/{MAX_IMAGES})
                </span>
                <span className="text-[9px] text-[#a1a1aa]">Tối đa 8MB</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
