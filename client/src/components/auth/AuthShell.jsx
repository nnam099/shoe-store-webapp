import { Link } from 'react-router-dom';

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] border border-[#deded8] bg-white shadow-xs">
        <aside className="bg-[#121212] text-white p-7 sm:p-9 lg:p-12 flex flex-col justify-between min-h-[220px] md:min-h-[560px]">
          <div>
            <Link
              to="/"
              className="inline-flex font-['Space_Grotesk'] text-2xl font-extrabold tracking-tighter focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
            >
              STEP<span className="text-[#dc2626]">/</span>LAB
            </Link>
            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
              {title}
            </h1>
          </div>
          <p className="mt-8 max-w-sm text-xs leading-6 text-neutral-400">
            {description}
          </p>
        </aside>

        <section className="p-6 sm:p-9 lg:p-12 flex flex-col justify-center min-w-0">
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
