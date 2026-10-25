import { useState } from 'react';
import { Link } from 'react-router-dom';

const COLLAPSED_CATEGORY_COUNT = 4;

/**
 * Compact Homepage navigation for active Categories that contain at least one
 * publicly accessible Product. Eligibility comes from Catalog options counts.
 */
function CategoryNavigation({ categories = null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const eligibleCategories = Array.isArray(categories)
    ? categories.filter((category) => (category.productCount ?? category.count ?? 0) > 0)
    : [];

  if (eligibleCategories.length === 0) return null;

  const canExpand = eligibleCategories.length > 5;
  const expanded = canExpand && isExpanded;
  const visibleCategories = expanded
    ? eligibleCategories
    : eligibleCategories.slice(0, canExpand ? COLLAPSED_CATEGORY_COUNT : eligibleCategories.length);
  const hiddenCount = eligibleCategories.length - COLLAPSED_CATEGORY_COUNT;

  const categoryTileClass =
    'flex min-h-14 snap-start items-center justify-center border border-[#d4d4ce] bg-white px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-[#121212] transition-colors hover:border-[#121212] hover:bg-[#121212] hover:text-white focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2';
  const categoryTileLayoutClass = expanded
    ? 'w-full min-w-0'
    : 'min-w-40 flex-1 md:min-w-0 md:max-w-60';

  return (
    <section
      id="categories"
      className="scroll-mt-20 border-b border-[#e5e5e0] bg-white py-9 sm:scroll-mt-24 sm:py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 sm:mb-6">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b91c1c]" aria-hidden="true" />
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-[#121212] sm:text-2xl">
            Mua sắm theo danh mục
          </h2>
        </div>

        <div
          id="homepage-category-list"
          className={
            expanded
              ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'
              : 'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:overflow-visible md:pb-0'
          }
        >
          {visibleCategories.map((category) => (
            <Link
              key={category.slug}
              to={`/products?category=${encodeURIComponent(category.slug)}`}
              className={`${categoryTileClass} ${categoryTileLayoutClass}`}
              title={category.name}
            >
              <span className="line-clamp-2 break-words">{category.name}</span>
            </Link>
          ))}

          {canExpand && !expanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className={`${categoryTileClass} ${categoryTileLayoutClass} border-[#991b1b] text-[#991b1b]`}
              aria-expanded="false"
              aria-controls="homepage-category-list"
            >
              +{hiddenCount} danh mục
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="min-h-11 px-2 text-xs font-bold uppercase tracking-wider text-[#991b1b] underline decoration-[#991b1b]/40 underline-offset-4 hover:text-[#7f1d1d] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
              aria-expanded="true"
              aria-controls="homepage-category-list"
            >
              Thu gọn
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoryNavigation;
