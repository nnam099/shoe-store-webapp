import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/authContextValue';

export default function RequireMember({ children }) {
  const { authNotice, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-lg border border-[#e5e5e0] bg-white p-6 text-xs text-[#737373]">
          Đang tải thông tin tài khoản...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const intendedPath = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: intendedPath, ...(authNotice ? { message: authNotice } : {}) }}
      />
    );
  }

  return children;
}
