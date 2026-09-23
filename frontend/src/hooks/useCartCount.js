import { useCallback, useEffect, useState } from "react";

import { cartApi } from "../api/cart.api.js";
import { useAuth } from "../auth/useAuth.js";
import {
  CART_UPDATED_EVENT,
  getGuestCartItems,
  GUEST_CART_KEY,
} from "../cart/guest-cart-storage.js";

function getGuestCount() {
  return getGuestCartItems().reduce((total, item) => total + item.quantity, 0);
}

export function useCartCount() {
  const { token, account, status } = useAuth();
  const [count, setCount] = useState(status === "anonymous" ? getGuestCount : null);

  const refresh = useCallback(async () => {
    if (status === "loading" || status === "error") {
      setCount(null);
      return;
    }

    if (status === "authenticated" && account?.role === "customer") {
      try {
        const result = await cartApi.getCart(token);
        setCount(result.cart.totalQuantity);
      } catch {
        setCount(null);
      }
      return;
    }

    setCount(getGuestCount());
  }, [account?.role, status, token]);

  useEffect(() => {
    let active = true;

    const update = () => {
      if (active) void refresh();
    };
    const updateFromStorage = (event) => {
      if (event.key === GUEST_CART_KEY || event.key === null) update();
    };

    update();
    globalThis.addEventListener(CART_UPDATED_EVENT, update);
    globalThis.addEventListener("storage", updateFromStorage);
    return () => {
      active = false;
      globalThis.removeEventListener(CART_UPDATED_EVENT, update);
      globalThis.removeEventListener("storage", updateFromStorage);
    };
  }, [refresh]);

  return count;
}
