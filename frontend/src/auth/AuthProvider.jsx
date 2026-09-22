import { useCallback, useEffect, useMemo, useState } from "react";

import { authApi } from "../api/auth.api.js";
import { cartApi } from "../api/cart.api.js";
import { clearGuestCart, getGuestCartItems } from "../cart/guest-cart-storage.js";
import { AuthContext } from "./AuthContext.js";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth-storage.js";

function describeMergeResult(result) {
  const adjusted = result.adjustments.filter((item) => item.status !== "merged");

  if (adjusted.length === 0) {
    return null;
  }

  return `${adjusted.length} dòng giỏ đã được điều chỉnh theo tồn kho hiện tại.`;
}

export function AuthProvider({ children }) {
  const [initialToken] = useState(() => getAccessToken());
  const [token, setToken] = useState(initialToken);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState(initialToken ? "loading" : "anonymous");
  const [sessionError, setSessionError] = useState(null);

  const logout = useCallback(() => {
    clearAccessToken();
    setToken(null);
    setAccount(null);
    setStatus("anonymous");
    setSessionError(null);
  }, []);

  useEffect(() => {
    if (!initialToken) {
      return undefined;
    }

    let active = true;
    authApi
      .getSession(initialToken)
      .then((result) => {
        if (active) {
          setAccount(result.account);
          setStatus("authenticated");
          setSessionError(null);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        if (error.status === 401) {
          clearAccessToken();
          setToken(null);
          setStatus("anonymous");
          return;
        }
        setSessionError("Không thể khôi phục phiên đăng nhập. Vui lòng thử lại.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [initialToken]);

  const loginCustomer = useCallback(async (credentials) => {
    const result = await authApi.loginCustomer(credentials);
    setAccessToken(result.accessToken);
    setToken(result.accessToken);
    setAccount(result.account);
    setStatus("authenticated");
    setSessionError(null);

    const guestItems = getGuestCartItems();

    if (guestItems.length === 0) {
      return { account: result.account, mergeMessage: null, mergeError: null };
    }

    try {
      const mergeResult = await cartApi.mergeGuestCart(result.accessToken, guestItems);
      clearGuestCart();
      return {
        account: result.account,
        mergeMessage: describeMergeResult(mergeResult),
        mergeError: null,
      };
    } catch {
      return {
        account: result.account,
        mergeMessage: null,
        mergeError: "Đăng nhập thành công nhưng chưa thể gộp giỏ. Giỏ trên thiết bị vẫn được giữ lại.",
      };
    }
  }, []);

  const updateAccount = useCallback((nextAccount) => {
    setAccount(nextAccount);
  }, []);

  const value = useMemo(
    () => ({
      token,
      account,
      status,
      sessionError,
      loginCustomer,
      logout,
      updateAccount,
    }),
    [token, account, status, sessionError, loginCustomer, logout, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
