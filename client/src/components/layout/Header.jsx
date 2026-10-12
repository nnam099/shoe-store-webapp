import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/authContextValue';
import useCartCount from '../../hooks/useCartCount';

function AccountIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.12a7.5 7.5 0 0115 0A17.93 17.93 0 0112 21.75c-2.68 0-5.22-.59-7.5-1.63z" />
    </svg>
  );
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const location = useLocation();
  const cartCount = useCartCount();
  const { isAuthenticated, isInitializing, member, logout } = useAuth();

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

  const handleNavClick = (link, event) => {
    closeMenus();
    if (link.href.startsWith('/#')) {
      const hash = link.href.slice(1);
      if (location.pathname === '/') {
        event.preventDefault();
        const element = document.querySelector(hash);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    window.location.replace(import.meta.env.BASE_URL);
  };

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenus();
    };
    const handlePointerDown = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f8f8f6]/95 backdrop-blur-md border-b border-[#e6e6e2] transition-colors">
      <div className="bg-[#121212] text-neutral-300 text-[10px] sm:text-[11px] font-medium tracking-wider uppercase py-2 px-3 text-center border-b border-[#2a2a2a] select-none">
        <p className="truncate">{siteConfig.announcement}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 lg:h-20 flex items-center justify-between">
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

          <nav className="hidden md:flex items-center space-x-8" aria-label="Menu chính">
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={(event) => handleNavClick(link, event)}
                className="text-xs font-bold uppercase tracking-widest text-[#525252] hover:text-[#121212] transition-colors py-1 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#991b1b] after:origin-bottom-right after:scale-x-0 hover:after:scale-x-100 hover:after:origin-bottom-left after:transition-transform after:duration-300 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-4 rounded-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative hidden md:block" ref={accountMenuRef}>
            {isInitializing ? (
              <span className="w-11 h-11 flex items-center justify-center text-[#a3a3a3]" aria-label="Đang tải tài khoản">
                <AccountIcon />
              </span>
            ) : isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-sm text-[#121212] hover:bg-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 transition-colors"
                aria-label={`Tài khoản của ${member.fullName}`}
                aria-expanded={isAccountMenuOpen}
                aria-controls="desktop-account-menu"
              >
                <AccountIcon />
              </button>
            ) : (
              <Link
                to="/login"
                className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-sm text-[#121212] hover:bg-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 transition-colors"
                aria-label="Đăng nhập Member"
              >
                <AccountIcon />
              </Link>
            )}

            {isAuthenticated && (
              <div
                id="desktop-account-menu"
                className={`absolute right-0 top-full mt-2 w-56 border border-[#d4d4ce] bg-white shadow-lg transition-all ${
                  isAccountMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0 pointer-events-none'
                }`}
              >
                <div className="border-b border-[#e6e6e2] px-4 py-3">
                  <p className="truncate text-xs font-bold text-[#121212]">{member.fullName}</p>
                  <p className="mt-0.5 truncate text-[10px] text-[#737373]">{member.email}</p>
                </div>
                <Link
                  to="/account"
                  onClick={closeMenus}
                  className="flex min-h-[44px] items-center px-4 text-xs font-bold uppercase tracking-wider hover:bg-[#f5f5f3] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-[-2px]"
                >
                  Tài khoản
                </Link>
                <Link
                  to="/account/orders"
                  onClick={closeMenus}
                  className="flex min-h-[44px] items-center px-4 text-xs font-bold uppercase tracking-wider hover:bg-[#f5f5f3] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-[-2px]"
                >
                  Đơn hàng của tôi
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-[44px] w-full items-center px-4 text-left text-xs font-bold uppercase tracking-wider text-[#991b1b] hover:bg-[#fef2f2] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-[-2px]"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          <Link
            to="/cart"
            onClick={closeMenus}
            className="relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center p-2 rounded-sm text-[#121212] hover:bg-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 transition-colors cursor-pointer select-none"
            aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#b91c1c] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center leading-none tracking-tight shadow-xs">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center p-2.5 rounded-sm text-[#121212] hover:bg-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 transition-colors"
            aria-controls="mobile-menu-drawer"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-0 z-30 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

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
                onClick={(event) => handleNavClick(link, event)}
                className="text-base sm:text-lg font-bold uppercase tracking-wider text-[#121212] hover:text-[#991b1b] transition-colors py-3 border-b border-[#e6e6e2]/60 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 min-h-[44px] flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-[#d4d4ce] pt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#737373]">Member</p>
            {isInitializing ? (
              <p className="mt-3 text-xs text-[#737373]">Đang tải tài khoản...</p>
            ) : isAuthenticated ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="mb-1 truncate text-xs text-[#525252]">{member.fullName}</p>
                <Link
                  to="/account"
                  onClick={closeMenus}
                  className="min-h-[44px] flex items-center text-sm font-bold uppercase tracking-wider text-[#121212] hover:text-[#991b1b] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
                >
                  Tài khoản
                </Link>
                <Link
                  to="/account/orders"
                  onClick={closeMenus}
                  className="min-h-[44px] flex items-center text-sm font-bold uppercase tracking-wider text-[#121212] hover:text-[#991b1b] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
                >
                  Đơn hàng của tôi
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[44px] w-full text-left text-sm font-bold uppercase tracking-wider text-[#991b1b] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className="min-h-[44px] flex items-center justify-center border border-[#121212] bg-[#121212] px-3 text-xs font-bold uppercase tracking-wider text-white focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenus}
                  className="min-h-[44px] flex items-center justify-center border border-[#121212] px-3 text-xs font-bold uppercase tracking-wider text-[#121212] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
            {siteConfig.name} • {siteConfig.tagline}
          </div>
        </div>
      </div>
    </header>
  );
}
