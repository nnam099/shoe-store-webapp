import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { cartApi } from "../../api/cart.api.js";
import { useAuth } from "../../auth/useAuth.js";
import {
  capGuestCartItem,
  getGuestCartItems,
  notifyCartUpdated,
  removeGuestCartItem,
  updateGuestCartItem,
} from "../../cart/guest-cart-storage.js";
import { CartItemRow } from "../../components/cart/CartItemRow.jsx";
import { CartRemoveDialog } from "../../components/cart/CartRemoveDialog.jsx";
import { CartSummary } from "../../components/cart/CartSummary.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const emptyCart = { items: [], subtotal: 0, totalQuantity: 0, hasUnavailableItems: false };

export function CartPage() {
  useDocumentTitle("Giỏ hàng");
  const { token, account, status, sessionError } = useAuth();
  const isCustomer = status === "authenticated" && account?.role === "customer";
  const modeKey = isCustomer ? `customer:${account.id}:${token}` : "guest";
  const [cart, setCart] = useState(emptyCart);
  const [drafts, setDrafts] = useState({});
  const [loadedKey, setLoadedKey] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyItemId, setBusyItemId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [removeItem, setRemoveItem] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${modeKey}:${reloadKey}`;
  const loading = status === "loading" || (status !== "error" && loadedKey !== requestKey);
  const error = status === "error"
    ? sessionError ?? "Không thể xác định phiên đăng nhập."
    : loadedKey === requestKey
      ? loadError
      : null;

  const applyCart = useCallback((nextCart) => {
    setCart(nextCart);
    setDrafts(
      Object.fromEntries(nextCart.items.map((item) => [item.productVariantId, String(item.quantity)])),
    );
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return undefined;
    }
    if (status === "error") {
      return undefined;
    }

    let active = true;
    const request = isCustomer
      ? cartApi.getCart(token)
      : cartApi.validateGuestCart(getGuestCartItems());

    request
      .then((result) => {
        if (active) {
          applyCart(result.cart);
          setActionError(null);
          setLoadError(null);
          setLoadedKey(requestKey);
        }
      })
      .catch((requestError) => {
        if (active) {
          setLoadError(requestError.message ?? "Không thể tải giỏ hàng.");
          setLoadedKey(requestKey);
        }
      });

    return () => {
      active = false;
    };
  }, [applyCart, isCustomer, requestKey, status, token]);

  async function refreshGuestCart() {
    const result = await cartApi.validateGuestCart(getGuestCartItems());
    applyCart(result.cart);
  }

  async function updateItem(item, quantity) {
    if (item.stockQuantity !== null && quantity > item.stockQuantity) {
      setActionError(`Biến thể này chỉ còn ${item.stockQuantity} sản phẩm.`);
      return;
    }

    setBusyItemId(item.productVariantId);
    setActionError(null);
    try {
      if (isCustomer) {
        const result = await cartApi.updateItem(token, item.productVariantId, quantity);
        applyCart(result.cart);
        notifyCartUpdated();
      } else {
        const result = quantity === item.stockQuantity && item.status === "insufficient_stock"
          ? capGuestCartItem({ productVariantId: item.productVariantId, stockQuantity: quantity })
          : updateGuestCartItem({ productVariantId: item.productVariantId, quantity });
        if (!result.updated) throw new Error("Không thể lưu giỏ hàng trên trình duyệt.");
        await refreshGuestCart();
      }
    } catch (requestError) {
      setActionError(
        requestError.fields?.quantity
          ?? requestError.message
          ?? "Không thể cập nhật dòng giỏ hàng.",
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function confirmRemove() {
    if (!removeItem) return;
    setBusyItemId(removeItem.productVariantId);
    setActionError(null);
    try {
      if (isCustomer) {
        const result = await cartApi.deleteItem(token, removeItem.productVariantId);
        applyCart(result.cart);
        notifyCartUpdated();
      } else {
        const result = removeGuestCartItem(removeItem.productVariantId);
        if (!result.removed) throw new Error("Không thể lưu giỏ hàng trên trình duyệt.");
        await refreshGuestCart();
      }
      setRemoveItem(null);
    } catch (requestError) {
      setActionError(requestError.message ?? "Không thể xóa dòng giỏ hàng.");
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Giỏ hàng</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">Những đôi giày bạn đã chọn</h1>
        <p className="mt-3 text-muted">Giá và tình trạng hàng được kiểm tra lại mỗi khi bạn mở trang.</p>
      </div>

      {loading ? (
        <p role="status" className="rounded-xl border border-line bg-white/60 py-16 text-center text-muted">Đang tải giỏ hàng...</p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-6 text-coral">
          <p>{error}</p>
          {status !== "error" ? (
            <button type="button" className="mt-3 font-bold underline" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
          ) : null}
        </div>
      ) : cart.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface-glass px-6 py-16 text-center backdrop-blur-sm">
          <h2 className="font-display text-2xl font-black text-ink">Giỏ hàng đang trống</h2>
          <p className="mt-2 text-muted">Hãy chọn một đôi giày và biến thể phù hợp với bạn.</p>
          <Link to="/san-pham" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-cobalt px-5 font-bold text-white hover:bg-cobalt-deep">Xem sản phẩm</Link>
        </div>
      ) : (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-4">
            {actionError ? <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{actionError}</p> : null}
            {cart.items.map((item) => (
              <CartItemRow
                key={item.productVariantId}
                item={item}
                draftQuantity={drafts[item.productVariantId] ?? String(item.quantity)}
                busy={busyItemId === item.productVariantId}
                onDraftChange={(value) => setDrafts((current) => ({ ...current, [item.productVariantId]: value }))}
                onUpdate={(quantity) => updateItem(item, quantity)}
                onRemove={() => setRemoveItem(item)}
              />
            ))}
          </div>
          <CartSummary cart={cart} />
        </div>
      )}

      <CartRemoveDialog
        item={removeItem}
        busy={removeItem ? busyItemId === removeItem.productVariantId : false}
        onCancel={() => setRemoveItem(null)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
