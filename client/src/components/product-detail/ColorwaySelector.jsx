import { getAssetUrl } from '../../config/site';

/**
 * ColorwaySelector Component
 * Displays 4 real Colorway options using actual 1.avif thumbnails.
 * Shows selected colorway name and handles user colorway switching.
 */
function ColorwaySelector({
  colorways = [],
  selectedColorwaySlug = '',
  onSelectColorway,
}) {
  const selectedColorway =
    colorways.find((cw) => cw.slug === selectedColorwaySlug) || colorways[0];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
          Màu sắc:{' '}
          <strong className="text-[#121212] ml-1 font-extrabold">
            {selectedColorway ? selectedColorway.name : ''}
          </strong>
        </span>
      </div>

      <div
        className="grid grid-cols-4 gap-2.5 sm:gap-3"
        role="group"
        aria-label="Chọn phối màu sản phẩm"
      >
        {colorways.map((cw) => {
          const isSelected = cw.slug === selectedColorwaySlug;
          return (
            <button
              key={cw.slug}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Chọn phối màu ${cw.name}`}
              onClick={() => onSelectColorway(cw.slug)}
              className={`group relative flex flex-col items-center bg-[#f5f5f3] p-1.5 border rounded-xs transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#121212] ring-2 ring-[#121212] shadow-2xs'
                  : 'border-[#e5e5e0] hover:border-[#737373] hover:bg-[#efefe9]'
              }`}
            >
              <div className="w-full aspect-square flex items-center justify-center overflow-hidden">
                <img
                  src={getAssetUrl(cw.thumbnail)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-center text-[#121212] mt-1 line-clamp-1 w-full px-0.5">
                {cw.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorwaySelector;
