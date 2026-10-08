import { useRef } from 'react';
import { getAssetUrl } from '../../config/site';

/**
 * DesktopZoomTile Component
 * Editorial image tile for desktop (>= 1024px) featuring cursor-follow hover zoom.
 * Calculates cursor position percentage to update transformOrigin dynamically
 * with zero component re-renders.
 */
function DesktopZoomTile({ src, alt, isSpan2 = false }) {
  const imgRef = useRef(null);

  const handleMouseEnter = (e) => {
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    if (imgRef.current) {
      imgRef.current.style.transformOrigin = `${x}% ${y}%`;
      imgRef.current.style.transform = 'scale(1.9)';
    }
  };

  const handleMouseMove = (e) => {
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    if (imgRef.current) {
      imgRef.current.style.transformOrigin = `${x}% ${y}%`;
    }
  };

  const handleMouseLeave = () => {
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs overflow-hidden flex items-center justify-center p-6 sm:p-8 cursor-crosshair select-none ${
        isSpan2 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'
      }`}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200 ease-out will-change-transform"
      />
    </div>
  );
}

/**
 * ProductGallery Component
 * Displays product images for the selected colorway.
 * Desktop (>= 1024px): Editorial 2-column grid showing all 3 or 4 images simultaneously
 * with cursor-follow hover zoom.
 * Mobile (< 1024px): Hero showcase on top + horizontal thumbnail rail with image counter.
 */
function ProductGallery({
  images = [],
  productName = '',
  colorwayName = '',
  activeImageIndex = 0,
  onSelectImage,
}) {
  const safeIndex = Math.min(Math.max(0, activeImageIndex), Math.max(0, images.length - 1));
  const currentImage = images[safeIndex] || images[0];

  return (
    <div className="w-full">
      {/* Desktop Layout (>= 1024px / lg): Editorial 2-Column Grid */}
      <div className="hidden lg:grid grid-cols-2 gap-3" aria-label="Bộ sưu tập ảnh sản phẩm">
        {images.map((imgSrc, idx) => {
          const isSpan2 = images.length === 3 && idx === 2;
          return (
            <DesktopZoomTile
              key={`${imgSrc}-${idx}`}
              src={getAssetUrl(imgSrc)}
              alt={`${productName} - ${colorwayName} - Góc nhìn ${idx + 1}`}
              isSpan2={isSpan2}
            />
          );
        })}
      </div>

      {/* Mobile & Tablet Layout (< 1024px): Main Hero Top + Horizontal Thumbnails Below */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Main Hero Image */}
        <div className="relative w-full aspect-square bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          {currentImage ? (
            <img
              src={getAssetUrl(currentImage)}
              alt={`${productName} - ${colorwayName} - Góc nhìn ${safeIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-xs text-[#a3a3a3]">Không có ảnh</div>
          )}

          {/* Mobile Index Counter */}
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-xs border border-[#e5e5e0] text-[10px] font-bold text-[#737373] rounded-xs tracking-wider select-none">
            {safeIndex + 1} / {images.length}
          </div>
        </div>

        {/* Horizontal Thumbnails Row */}
        <div
          className="flex items-center gap-2.5 overflow-x-auto pb-1 select-none"
          role="tablist"
          aria-label="Danh sách ảnh sản phẩm"
        >
          {images.map((imgSrc, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={`${imgSrc}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Xem ảnh ${idx + 1}`}
                onClick={() => onSelectImage(idx)}
                className={`relative shrink-0 w-16 h-16 bg-[#f5f5f3] border p-1 rounded-xs transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[#121212] ring-1 ring-[#121212]'
                    : 'border-[#e5e5e0] opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={getAssetUrl(imgSrc)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProductGallery;
