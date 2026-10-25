import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../../context/adminContextValue';

const NAV_ITEMS = [
  {
    group: 'Tổng quan',
    items: [
      {
        label: 'Bảng điều khiển',
        to: '/admin',
        exact: true,
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Bán hàng & Vận hành',
    items: [
      {
        label: 'Đơn hàng',
        to: '/admin/orders',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ),
      },
      {
        label: 'Khách hàng',
        to: '/admin/customers',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ),
      },
      {
        label: 'Đánh giá',
        to: '/admin/reviews',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Quản lý sản phẩm',
    items: [
      {
        label: 'Tất cả sản phẩm',
        to: '/admin/products',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        label: 'Thương hiệu',
        to: '/admin/brands',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
      {
        label: 'Danh mục',
        to: '/admin/categories',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      {
        label: 'Tài khoản Quản trị',
        to: '/admin/accounts',
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminSidebar({ onClose }) {
  const location = useLocation();
  const { admin, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    window.location.replace('/admin/login');
  };

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-[#121212] text-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[#262626] px-6 py-5">
        <div>
          <Link
            to="/admin"
            className="group inline-flex items-baseline gap-0.5 focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-2 rounded-xs"
            aria-label="STEP/LAB Administration"
          >
            <span className="font-['Space_Grotesk'] text-xl font-extrabold tracking-tighter text-white">
              STEP<span className="text-[#991b1b]">/</span>LAB
            </span>
          </Link>
          <div className="mt-1 block border border-[#991b1b] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#f87171] w-fit">
            Administration
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-[#9ca3af] hover:text-white transition-colors lg:hidden"
            aria-label="Đóng menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="mb-1 px-6 text-[9px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
              {group.group}
            </p>
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 border-l-2 px-6 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#991b1b] bg-[#1c1c1c] text-white'
                      : 'border-transparent text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin Profile Footer */}
      <div className="border-t border-[#262626] px-6 py-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Quản trị viên</p>
        <p className="text-sm font-semibold text-white truncate">{admin?.fullName || '—'}</p>
        <p className="text-[11px] text-[#9ca3af] truncate mt-0.5">{admin?.email || ''}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-2 border border-[#3f3f46] px-3 py-2 text-xs font-medium text-[#9ca3af] hover:border-[#ef4444] hover:text-[#f87171] transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
