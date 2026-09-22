import { Link } from "react-router";

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="grid min-h-screen place-items-center bg-auth px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-cobalt/10 backdrop-blur-xl sm:p-8">
        <Link to="/" className="font-display text-xl font-black tracking-tight text-cobalt">
          SẢI
        </Link>
        <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p> : null}
        <div className="mt-7">{children}</div>
        {footer ? <div className="mt-6 border-t border-slate-200 pt-5 text-sm">{footer}</div> : null}
      </section>
    </main>
  );
}
