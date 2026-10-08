import { siteConfig } from '../../config/site';

export default function Footer() {
  return (
    <footer className="bg-[#121212] text-neutral-300 border-t border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-8 sm:pb-10 border-b border-[#2a2a2a]">
          {/* Brand Manifesto & Info */}
          <div className="md:col-span-6 space-y-4">
            <a
              href="#"
              className="inline-block focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-4 rounded-sm py-1"
              aria-label={`${siteConfig.name} - Trang chủ`}
            >
              <span className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold tracking-tighter text-white">
                STEP<span className="text-[#991b1b]">/</span>LAB
              </span>
            </a>
            <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
              Cửa hàng giày thể thao và streetwear đa thương hiệu. Tuyển chọn các sản phẩm từ Nike, Adidas, New Balance, Puma và Converse.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 text-[11px] sm:text-xs font-mono text-neutral-400">
              <span className="px-2.5 py-1 bg-[#1e1e1e] border border-[#333333] text-neutral-300">
                COD PAYMENT
              </span>
              <span className="px-2.5 py-1 bg-[#1e1e1e] border border-[#333333] text-neutral-300">
                EU 36–44 SIZING
              </span>
            </div>
          </div>

          {/* Quick Navigation (Real Working Links Only) */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-widest text-white">
              Điều hướng
            </h3>
            <ul className="space-y-1 text-sm">
              {siteConfig.navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors py-2 inline-flex items-center min-h-[36px] focus-visible:outline-2 focus-visible:outline-[#991b1b] rounded-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Note (Confirmed Business Rules Only) */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-widest text-white">
              Dịch vụ bán hàng
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Hỗ trợ giao hàng và thanh toán trực tiếp khi nhận hàng (COD) trên toàn quốc.
            </p>
          </div>
        </div>

        {/* Bottom Bar / Copyright */}
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-neutral-500">
          <p>{siteConfig.copyright}</p>
          <p className="tracking-wider text-[11px] sm:text-xs">MULTI-BRAND FOOTWEAR STOREFRONT</p>
        </div>
      </div>
    </footer>
  );
}
