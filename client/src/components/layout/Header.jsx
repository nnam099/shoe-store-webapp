import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = (link, e) => {
    setIsMobileMenuOpen(false);
    if (link.href.startsWith('/#')) {
      const hash = link.href.slice(1);
      if (location.pathname === '/') {
        e.preventDefault();
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Manage body scroll lock when mobile drawer is open with cleanup on unmount
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f8f8f6]/95 backdrop-blur-md border-b border-[#e6e6e2] transition-colors">
      {/* Announcement Bar */}
      <div className="bg-[#121212] text-neutral-300 text-[10px] sm:text-[11px] font-medium tracking-wider uppercase py-2 px-3 text-center border-b border-[#2a2a2a] select-none">
        <p className="truncate">{siteConfig.announcement}</p>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 lg:h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="group flex items-baseline gap-1 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-4 rounded-sm py-1"
            aria-label={`${siteConfig.name} - Trang chủ`}
          >
            <span className="font-['Space_Grotesk'] text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tighter text-[#121212] group-hover:text-[#991b1b] transition-colors">
              STEP<span className="text-[#991b1b]">/</span>LAB
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Menu chính">
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={(e) => handleNavClick(link, e)}
                className="text-xs font-bold uppercase tracking-widest text-[#525252] hover:text-[#121212] transition-colors py-1 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#991b1b] after:origin-bottom-right after:scale-x-0 hover:after:scale-x-100 hover:after:origin-bottom-left after:transition-transform after:duration-300 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-4 rounded-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Hamburger Button (Touch Target >= 44x44px) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center p-2.5 rounded-sm text-[#121212] hover:bg-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 transition-colors"
            aria-controls="mobile-menu-drawer"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-0 z-30 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Content */}
      <div
        id="mobile-menu-drawer"
        className={`absolute top-full left-0 right-0 z-40 bg-[#f8f8f6] border-b border-[#e6e6e2] shadow-xl md:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
        }`}
        aria-label="Menu di động"
      >
        <div className="px-6 py-8 space-y-6">
          <div className="flex flex-col space-y-3">
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={(e) => handleNavClick(link, e)}
                className="text-base sm:text-lg font-bold uppercase tracking-wider text-[#121212] hover:text-[#991b1b] transition-colors py-3 border-b border-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 min-h-[44px] flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
            {siteConfig.name} • {siteConfig.tagline}
          </div>
        </div>
      </div>
    </header>
  );
}
