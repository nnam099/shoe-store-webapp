import { useRef, useEffect, useCallback } from 'react';
import { getAssetUrl } from '../../config/site';

/**
 * usePointerZoom Custom Hook
 * Reusable cursor-follow hover zoom logic for fine-pointer devices.
 * Updates transformOrigin and transform directly on the image element ref
 * with zero component re-renders.
 */
function usePointerZoom() {
  const imgRef = useRef(null);

  const onMouseEnter = (e) => {
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

  const onMouseMove = (e) => {
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

  const onMouseLeave = () => {
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
    }
  };

  const resetZoom = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
      imgRef.current.style.transformOrigin = '50% 50%';
    }
  }, []);

  return {
    imgRef,
    zoomProps: {
      onMouseEnter,
      onMouseMove,
      onMouseLeave,
    },
    resetZoom,
  };
}

/**
 * DesktopZoomTile Component
 * Editorial image tile for desktop (>= 1024px) featuring cursor-follow hover zoom.
 */
function DesktopZoomTile({ src, alt, isSpan2 = false }) {
  const { imgRef, zoomProps } = usePointerZoom();

  return (
    <div
      {...zoomProps}
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
 * Supports cursor-follow zoom on main image when a fine pointer/mouse is used.
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

  const {
    imgRef: mobileImgRef,
    zoomProps: mobileZoomProps,
    resetZoom: resetMobileZoom,
  } = usePointerZoom();

  // Reset zoom on mobile main image when active image changes (thumbnail click or colorway switch)
  useEffect(() => {
    resetMobileZoom();
  }, [currentImage, resetMobileZoom]);

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
        <div
          {...mobileZoomProps}
          className="relative w-full aspect-square bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none cursor-crosshair"
        >
          {currentImage ? (
            <img
              ref={mobileImgRef}
              src={getAssetUrl(currentImage)}
              alt={`${productName} - ${colorwayName} - Góc nhìn ${safeIndex + 1}`}
              className="w-full h-full object-contain pointer-events-none transition-transform duration-200 ease-out will-change-transform"
            />
          ) : (
            <div className="text-xs text-[#a3a3a3]">Không có ảnh</div>
          )}

          {/* Mobile Index Counter */}
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-xs border border-[#e5e5e0] text-[10px] font-bold text-[#737373] rounded-xs tracking-wider select-none pointer-events-none">
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
