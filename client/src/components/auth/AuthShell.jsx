import { Link } from 'react-router-dom';

export default function AuthShell({
  variant = 'editorial',
  eyebrow,
  title,
  railMeta,
  description,
  children,
  footer,
}) {
  const isCompact = variant === 'compact';

  return (
    <div className={`${isCompact ? 'max-w-4xl' : 'max-w-6xl'} mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20`}>
      <div className={`grid grid-cols-1 ${
        isCompact
          ? 'md:grid-cols-[minmax(200px,0.43fr)_minmax(0,1fr)]'
          : 'md:grid-cols-[minmax(230px,0.56fr)_minmax(0,1fr)]'
      } border border-[#deded8] bg-white shadow-xs`}>
        <aside className={`bg-[#121212] text-white flex flex-col justify-center ${
          isCompact ? 'p-6 sm:p-8 lg:p-9' : 'p-7 sm:p-9 lg:p-12'
        }`}>
          <div className={isCompact ? 'max-w-[30ch]' : 'max-w-[34ch]'}>
            <Link
              to="/"
              className="inline-flex font-['Space_Grotesk'] text-2xl font-extrabold tracking-tighter focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
            >
              STEP<span className="text-[#dc2626]">/</span>LAB
            </Link>
            <p className={`${isCompact ? 'mt-6' : 'mt-8'} text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400`}>
              {eyebrow}
            </p>
            {railMeta && (
              <p className="mt-3 text-[11px] font-bold tracking-[0.18em] text-white">
                {railMeta}
              </p>
            )}
            {title && (
              <h1 className="mt-3 max-w-[10ch] text-balance text-[1.85rem] sm:text-[2rem] lg:text-[2.25rem] font-black uppercase tracking-[-0.025em] leading-[1.12]">
                {title}
              </h1>
            )}
            <p className={`${isCompact ? 'mt-5' : 'mt-6'} text-xs leading-6 text-neutral-400`}>
              {description}
            </p>
          </div>
        </aside>

        <section className={`${isCompact ? 'p-6 sm:p-8 lg:p-10' : 'p-6 sm:p-9 lg:p-12'} flex flex-col justify-center min-w-0`}>
          {children}
          {footer && (
            <div className="mt-8 pt-6 border-t border-[#e6e6e2] text-xs text-[#525252]">
              {footer}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
