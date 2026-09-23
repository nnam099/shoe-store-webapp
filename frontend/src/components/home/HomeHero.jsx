import { Link } from "react-router";

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-line" aria-labelledby="home-hero-title">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,oklch(0.72_0.15_264_/_35%),transparent_34%),radial-gradient(circle_at_85%_75%,oklch(0.78_0.12_170_/_30%),transparent_32%)]" />
      <div className="absolute -right-24 top-12 -z-10 h-72 w-72 rotate-12 rounded-3xl border border-white/70 bg-white/35 backdrop-blur-sm sm:right-10 sm:h-96 sm:w-96" aria-hidden="true" />
      <div className="mx-auto grid min-h-[34rem] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cobalt">SẢI / Bộ sưu tập trực tuyến</p>
          <h1 id="home-hero-title" className="mt-5 font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] text-ink sm:text-7xl lg:text-8xl">
            Sải bước,
            <span className="block text-cobalt">đúng chất.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Tìm đôi giày vừa vặn với nhịp sống của bạn — từ những bước chạy mỗi ngày đến phong cách riêng trên phố.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/san-pham"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cobalt px-6 py-3 text-sm font-bold text-white transition hover:bg-cobalt-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2"
            >
              Khám phá sản phẩm
            </Link>
            <a
              href="#danh-muc-noi-bat"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white/50 px-6 py-3 text-sm font-bold text-ink backdrop-blur-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2"
            >
              Xem danh mục
            </a>
          </div>
        </div>
        <div className="relative hidden min-h-80 lg:block" aria-hidden="true">
          <div className="absolute inset-x-8 top-4 rotate-3 rounded-2xl border border-white/70 bg-surface-glass p-7 backdrop-blur-xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-coral">Chọn đúng chất</p>
            <p className="mt-5 font-display text-5xl font-black text-ink">SẢI<span className="text-cobalt">.</span></p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <span className="h-20 rounded-xl bg-cobalt/85" />
              <span className="h-20 rounded-xl bg-mint/70" />
              <span className="h-20 rounded-xl bg-coral/75" />
            </div>
            <div className="mt-5 h-2 w-3/4 rounded-full bg-ink/15" />
            <div className="mt-3 h-2 w-1/2 rounded-full bg-ink/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
