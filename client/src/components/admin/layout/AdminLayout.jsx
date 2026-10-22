import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { AdminToastContainer, useToasts } from '../common/AdminToast';

/**
 * AdminLayout — Wraps all /admin/* pages with sidebar, topbar, toast container.
 * Handles responsive mobile sidebar toggle.
 */
export default function AdminLayout({ children, title, breadcrumbs = [] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, dismissToast } = useToasts();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f8f6]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 h-full">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e5e0] bg-white px-4 sm:px-6">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 text-[#6b7280] hover:text-[#121212] transition-colors lg:hidden"
            aria-label="Mở menu điều hướng"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <nav className="flex-1 flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
            <Link to="/admin/products" className="text-xs text-[#9ca3af] hover:text-[#121212] transition-colors shrink-0">
              Admin
            </Link>
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <svg className="h-3 w-3 text-[#d1d5db] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {bc.to ? (
                  <Link to={bc.to} className="text-xs text-[#9ca3af] hover:text-[#121212] transition-colors truncate">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-[#121212] truncate">{bc.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Quick link to Storefront */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6b7280] hover:text-[#121212] transition-colors ml-4 shrink-0"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Storefront
          </a>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {title && (
            <div className="border-b border-[#e5e5e0] bg-white px-6 py-5">
              <h1 className="text-lg font-bold text-[#121212]">{title}</h1>
            </div>
          )}
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Toast Notifications */}
      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/**
 * AdminPage — Convenience wrapper that combines AdminLayout with page content.
 * Passes toast functions via context-like prop drilling through children render prop.
 */
export function AdminPageShell({ title, breadcrumbs, children }) {
  const { toasts, addToast, dismissToast } = useToasts();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f8f6]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar handled per-page if needed */}
      <MobileAwareContent
        title={title}
        breadcrumbs={breadcrumbs}
        toasts={toasts}
        dismissToast={dismissToast}
      >
        {typeof children === 'function' ? children({ addToast }) : children}
      </MobileAwareContent>
    </div>
  );
}

function MobileAwareContent({ title, breadcrumbs = [], toasts, dismissToast, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 h-full">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e5e0] bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 text-[#6b7280] hover:text-[#121212] transition-colors lg:hidden"
            aria-label="Mở menu điều hướng"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <nav className="flex-1 flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
            <Link to="/admin/products" className="text-xs text-[#9ca3af] hover:text-[#121212] shrink-0">
              Admin
            </Link>
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <svg className="h-3 w-3 text-[#d1d5db] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {bc.to ? (
                  <Link to={bc.to} className="text-xs text-[#9ca3af] hover:text-[#121212] truncate">{bc.label}</Link>
                ) : (
                  <span className="text-xs font-medium text-[#121212] truncate">{bc.label}</span>
                )}
              </span>
            ))}
          </nav>

          <a href="/" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6b7280] hover:text-[#121212] transition-colors ml-4 shrink-0">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Storefront
          </a>
        </header>

        <main className="flex-1 overflow-y-auto">
          {title && (
            <div className="border-b border-[#e5e5e0] bg-white px-6 py-5">
              <h1 className="text-lg font-bold text-[#121212]">{title}</h1>
            </div>
          )}
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>

      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
