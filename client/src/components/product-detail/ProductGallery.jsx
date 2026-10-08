import { getAssetUrl } from '../../config/site';

/**
 * ProductGallery Component
 * Displays product images for the selected colorway.
 * Desktop: Left vertical thumbnail rail + large main showcase.
 * Mobile: Hero image on top + horizontal thumbnail selector with image counter.
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
      {/* Desktop Layout (>= 1024px / lg): Vertical Thumbnail Rail + Hero Display */}
      <div className="hidden lg:flex gap-4 items-start">
        {/* Thumbnail Rail (Left) */}
        <div
          className="flex flex-col gap-3 shrink-0 w-20"
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
                aria-label={`Xem ảnh góc nhìn ${idx + 1}`}
                onClick={() => onSelectImage(idx)}
                className={`relative w-20 aspect-square bg-[#f5f5f3] border p-1 rounded-xs transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[#121212] ring-1 ring-[#121212]'
                    : 'border-[#e5e5e0] opacity-75 hover:opacity-100 hover:border-[#a3a3a3]'
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

        {/* Hero Image Showcase (Right) */}
        <div className="flex-1 relative aspect-square bg-[#f5f5f3] border border-[#e5e5e0] rounded-xs flex items-center justify-center p-6 sm:p-10 overflow-hidden">
          {currentImage ? (
            <img
              src={getAssetUrl(currentImage)}
              alt={`${productName} - ${colorwayName} - Góc nhìn ${safeIndex + 1}`}
              className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="text-xs text-[#a3a3a3]">Không có ảnh</div>
          )}

          {/* Visual Index Counter */}
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-xs border border-[#e5e5e0] text-[10px] font-bold text-[#737373] rounded-xs tracking-wider select-none">
            {safeIndex + 1} / {images.length}
          </div>
        </div>
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
