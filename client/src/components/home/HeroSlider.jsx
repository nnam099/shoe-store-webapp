import { useState, useEffect, useCallback, useRef } from 'react';
import { siteConfig, getAssetUrl } from '../../config/site';

export default function HeroSlider() {
  const slides = siteConfig.heroSlides;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const sliderRef = useRef(null);

  // Subscribe to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Navigation handlers
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  // Autoplay effect with 5000ms interval
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, goToNext, currentIndex]);

  return (
    <section
      ref={sliderRef}
      className="relative w-full bg-[#121212] overflow-hidden select-none focus:outline-none"
      aria-roledescription="carousel"
      aria-label="Bộ sưu tập và thương hiệu nổi bật"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Slides Container: Mobile height 480-520px, desktop aspect ratios */}
      <div className="relative w-full h-[480px] sm:h-[520px] md:h-auto md:aspect-[16/9] lg:aspect-[21/9] xl:aspect-[2.4/1] md:min-h-[500px] lg:min-h-[540px] max-h-[680px]">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} trên ${slides.length}: ${slide.title}`}
              aria-hidden={!isActive}
            >
              {/* Background Image */}
              <img
                src={getAssetUrl(slide.image)}
                alt={slide.alt}
                className="w-full h-full object-cover"
                style={{ objectPosition: slide.objectPosition || 'center center' }}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
              />

              {/* Gradient Scrim - optimized contrast for mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent sm:bg-gradient-to-r sm:from-black/85 sm:via-black/35 sm:to-transparent" />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-end sm:items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16 sm:pb-0">
                  <div className="max-w-xl lg:max-w-2xl space-y-2.5 sm:space-y-4 text-left">
                    {/* Tag badge */}
                    <div className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#991b1b]" />
                      <span className="font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-neutral-300">
                        {slide.tag}
                      </span>
                    </div>

                    {/* Headline */}
                    <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                      {slide.title}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-xs sm:text-sm lg:text-base text-neutral-300 font-normal leading-relaxed max-w-md sm:max-w-lg line-clamp-2 sm:line-clamp-none">
                      {slide.subtitle}
                    </p>

                    {/* CTA button leading to #brands (Touch target >= 44px) */}
                    <div className="pt-2 sm:pt-4">
                      <a
                        href={slide.ctaHref}
                        className="inline-flex items-center gap-2.5 bg-white text-[#121212] hover:bg-[#991b1b] hover:text-white px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 min-h-[44px]"
                      >
                        <span>{slide.ctaText}</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Previous / Next Desktop Controls (Hidden on Mobile) */}
      <div className="hidden md:flex absolute inset-y-0 left-0 right-0 z-20 items-center justify-between px-4 sm:px-6 pointer-events-none">
        <button
          type="button"
          onClick={goToPrev}
          className="pointer-events-auto p-3 rounded-none bg-black/40 hover:bg-[#991b1b] text-white border border-white/20 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Slide trước đó"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goToNext}
          className="pointer-events-auto p-3 rounded-none bg-black/40 hover:bg-[#991b1b] text-white border border-white/20 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Slide kế tiếp"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Indicators / Progress Bar */}
      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Dash Indicators with safe touch target */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Chọn slide">
            {slides.map((slide, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Chuyển tới slide ${index + 1}`}
                  onClick={() => goToSlide(index)}
                  className="py-2 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span
                    className={`block h-1.5 transition-all duration-300 rounded-none ${
                      isActive ? 'w-7 sm:w-10 bg-[#991b1b]' : 'w-3 sm:w-4 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Slide counter */}
          <div className="font-mono text-xs sm:text-sm text-neutral-400 font-semibold tracking-widest">
            <span className="text-white">0{currentIndex + 1}</span>
            <span className="mx-1 text-neutral-600">/</span>
            <span>0{slides.length}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
