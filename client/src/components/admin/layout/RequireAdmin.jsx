import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../../context/adminContextValue';

/**
 * RequireAdmin — Protects all /admin/* routes.
 * Redirects to /admin/login if admin is not authenticated.
 * Preserves the intended path for post-login redirect.
 */
export default function RequireAdmin({ children }) {
  const { isAuthenticated, isInitializing } = useAdminAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f6]">
        <div className="text-sm text-[#737373]">Đang xác thực phiên quản trị...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
