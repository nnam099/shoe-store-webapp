import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminGetMe, adminLogin } from '../services/adminService';
import { clearAdminToken, getAdminToken, setAdminToken } from '../utils/adminSession';
import { AdminContext } from './adminContextValue';

/**
 * AdminProvider — Manages Admin authentication state completely isolated from Member auth.
 * - Reads token from localStorage on mount and verifies it via GET /api/admin/auth/me.
 * - Provides login, logout, onUnauthorized callback for child components.
 * - Does NOT touch Member sessionStorage or AuthContext.
 */
export function AdminProvider({ children }) {
  const [initialToken] = useState(getAdminToken);
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(initialToken);
  const [isInitializing, setIsInitializing] = useState(Boolean(initialToken));

  // Callback refs used by service layer to trigger session expiration without circular deps
  const onUnauthorizedRef = useRef(null);

  const clearSession = useCallback(() => {
    clearAdminToken();
    setToken(null);
    setAdmin(null);
  }, []);

  // Register an "on unauthorized" callback so API calls can trigger logout
  const registerUnauthorizedHandler = useCallback((handler) => {
    onUnauthorizedRef.current = handler;
  }, []);

  useEffect(() => {
    let active = true;
    if (!initialToken) return undefined;

    adminGetMe(initialToken)
      .then((data) => {
        if (!active) return;
        if (!data?.admin) throw new Error('Invalid admin response');
        setToken(initialToken);
        setAdmin(data.admin);
      })
      .catch(() => {
        if (!active) return;
        clearAdminToken();
        setToken(null);
        setAdmin(null);
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    return () => { active = false; };
  }, [initialToken]);

  const login = useCallback(async (credentials) => {
    const data = await adminLogin(credentials);
    if (!data?.token || !data?.admin) throw new Error('Phản hồi đăng nhập không hợp lệ.');
    setAdminToken(data.token);
    setToken(data.token);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // Called by service layer when a 401 is received during any admin API call
  const handleUnauthorized = useCallback(() => {
    clearSession();
    if (onUnauthorizedRef.current) onUnauthorizedRef.current();
  }, [clearSession]);

  const value = useMemo(() => ({
    admin,
    token,
    isInitializing,
    isAuthenticated: Boolean(admin && token),
    login,
    logout,
    handleUnauthorized,
    registerUnauthorizedHandler,
    setAdmin,
  }), [admin, token, isInitializing, login, logout, handleUnauthorized, registerUnauthorizedHandler]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
