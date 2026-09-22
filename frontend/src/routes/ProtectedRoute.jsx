import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "../auth/useAuth.js";

export function ProtectedRoute({ allowedRole, loginPath }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return <p role="status">Đang kiểm tra phiên đăng nhập...</p>;
  }

  if (auth.status === "error") {
    return <p role="alert">{auth.sessionError}</p>;
  }

  if (auth.status !== "authenticated") {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (auth.account?.role !== allowedRole) {
    const fallback = auth.account?.role === "admin" ? "/admin" : "/tai-khoan";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
