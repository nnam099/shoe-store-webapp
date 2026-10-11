import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changeMemberPassword,
  forgotMemberPassword,
  getCurrentMember,
  loginMember,
  registerMember,
  updateMemberProfile,
} from '../services/authService';
import {
  clearMemberToken,
  getMemberToken,
  setMemberToken,
} from '../utils/memberSession';
import { AuthContext } from './authContextValue';

function isUnauthorized(error) {
  return error?.status === 401 && error?.code === 'UNAUTHORIZED';
}

export function AuthProvider({ children }) {
  const [initialToken] = useState(getMemberToken);
  const [member, setMember] = useState(null);
  const [token, setToken] = useState(initialToken);
  const [isInitializing, setIsInitializing] = useState(Boolean(initialToken));
  const [authNotice, setAuthNotice] = useState('');

  const clearAuthentication = useCallback(() => {
    clearMemberToken();
    setToken(null);
    setMember(null);
  }, []);

  const clearSession = useCallback(() => {
    clearAuthentication();
    setAuthNotice('');
  }, [clearAuthentication]);

  useEffect(() => {
    let active = true;
    if (!initialToken) return undefined;

    getCurrentMember(initialToken)
      .then((data) => {
        if (!active) return;
        if (!data?.member) throw new Error('Invalid Member response');
        setToken(initialToken);
        setMember(data.member);
      })
      .catch(() => {
        if (!active) return;
        clearMemberToken();
        setToken(null);
        setMember(null);
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [initialToken]);

  const establishSession = useCallback((data) => {
    if (!data?.token || !data?.member) {
      throw new Error('Phản hồi đăng nhập không hợp lệ.');
    }

    setMemberToken(data.token);
    setToken(data.token);
    setMember(data.member);
    setAuthNotice('');
    return data.member;
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginMember(credentials);
    return establishSession(data);
  }, [establishSession]);

  const register = useCallback(async (registration) => {
    const data = await registerMember(registration);
    return establishSession(data);
  }, [establishSession]);

  const updateProfile = useCallback(async (profile) => {
    if (!token) throw new Error('Phiên đăng nhập không còn hợp lệ.');

    try {
      const data = await updateMemberProfile(token, profile);
      if (!data?.member) throw new Error('Phản hồi tài khoản không hợp lệ.');
      setMember(data.member);
      return data.member;
    } catch (error) {
      if (isUnauthorized(error)) clearSession();
      throw error;
    }
  }, [clearSession, token]);

  const changePassword = useCallback(async (payload) => {
    if (!token) throw new Error('Phiên đăng nhập không còn hợp lệ.');

    try {
      const result = await changeMemberPassword(token, payload);
      clearAuthentication();
      setAuthNotice('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      return result;
    } catch (error) {
      if (isUnauthorized(error)) clearSession();
      throw error;
    }
  }, [clearAuthentication, clearSession, token]);

  const forgotPassword = useCallback(async (payload) => {
    const result = await forgotMemberPassword(payload);
    clearSession();
    return result;
  }, [clearSession]);

  const value = useMemo(() => ({
    member,
    token,
    authNotice,
    isInitializing,
    isAuthenticated: Boolean(member && token),
    login,
    register,
    updateProfile,
    changePassword,
    forgotPassword,
    logout: clearSession,
    clearSession,
  }), [
    authNotice,
    changePassword,
    clearSession,
    forgotPassword,
    isInitializing,
    login,
    member,
    register,
    token,
    updateProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
