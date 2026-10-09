import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getCart,
  saveCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from '../utils/cartStorage';
import {
  hydrateCartItems,
  getNormalizedCart,
  calculateCartTotals,
} from '../services/cartService';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyCart from '../components/cart/EmptyCart';

/**
 * Loads cart from storage and normalizes any stale identities or clamped quantities.
 * Ensures storage is normalized synchronously before first render.
 */
function loadAndNormalizeCart() {
  const raw = getCart();
  const hydrated = hydrateCartItems(raw);
  const { normalizedCart, hasChanges, prunedCount } = getNormalizedCart(hydrated);

  if (hasChanges) {
    saveCart(normalizedCart);
  }

  return {
    items: normalizedCart,
    hadPruned: prunedCount > 0,
  };
}

/**
 * CartPage Component
 * Main cart experience for STEP/LAB storefront.
 * Features synchronous initial hydration, continuous catalog revalidation,
 * controlled normalization of invalid/stale identities, and cross-tab/same-tab sync.
 */
function CartPage() {
  // Synchronous initial load & normalization to prevent cascading renders and empty flashes
  const [cartState, setCartState] = useState(() => loadAndNormalizeCart());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [normalizationNotice, setNormalizationNotice] = useState(() =>
    cartState.hadPruned ? 'Một số sản phẩm không còn khả dụng đã được cập nhật khỏi giỏ hàng.' : null
  );

  const storedItems = cartState.items;

  // Auto-dismiss normalization notice after 4 seconds
  useEffect(() => {
    if (normalizationNotice) {
      const timer = setTimeout(() => {
        setNormalizationNotice(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [normalizationNotice]);

  // Listen for cart mutations in same tab or other tabs
  useEffect(() => {
    const handleSync = () => {
      const next = loadAndNormalizeCart();
      setCartState(next);
      if (next.hadPruned) {
        setNormalizationNotice('Một số sản phẩm không còn khả dụng đã được cập nhật khỏi giỏ hàng.');
      }
    };

    const handleStorage = (e) => {
      // Only react if cart storage key was updated or localStorage was cleared (e.key === null)
      if (e.key === CART_STORAGE_KEY || e.key === null) {
        handleSync();
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Pure catalog rehydration
  const hydratedItems = useMemo(() => {
    return hydrateCartItems(storedItems);
  }, [storedItems]);

  // Totals calculation
  const { subtotal, totalQuantity, hasOutOfStock } = useMemo(() => {
    return calculateCartTotals(hydratedItems);
  }, [hydratedItems]);

  // Handlers
  const handleUpdateQuantity = (id, newQuantity, stockLimit) => {
    const updated = updateCartItemQuantity(id, newQuantity, stockLimit);
    setCartState({ items: updated, hadPruned: false });
  };

  const handleRemoveItem = (id) => {
    const updated = removeCartItem(id);
    setCartState({ items: updated, hadPruned: false });
  };

  const handleConfirmClear = () => {
    clearCart();
    setCartState({ items: [], hadPruned: false });
    setIsConfirmingClear(false);
  };

  return (
    <div className="bg-[#f8f8f6] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav
          className="text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-6 flex items-center gap-1.5 select-none"
          aria-label="Đường dẫn trang"
        >
          <Link to="/" className="hover:text-[#121212] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#121212]">Giỏ hàng</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6 sm:mb-8 border-b border-[#e5e5e0] pb-4 flex items-baseline justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#121212]">
            Giỏ hàng của bạn
          </h1>
          {hydratedItems.length > 0 && (
            <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
              {totalQuantity} sản phẩm
            </span>
          )}
        </div>

        {/* Normalization Status Notice */}
        {normalizationNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 p-3 bg-[#fefce8] border border-[#fef08a] text-[#854d0e] text-xs font-semibold rounded-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0 text-[#ca8a04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{normalizationNotice}</span>
          </div>
        )}

        {/* Main Cart Content */}
        {hydratedItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Cart Items Column (Desktop: 65% / 8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="divide-y divide-[#e5e5e0]">
                {hydratedItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>

              {/* Clear Cart Action Bar */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                <Link
                  to="/products"
                  className="min-h-[44px] py-2 text-xs font-bold text-[#121212] hover:text-[#b91c1c] underline underline-offset-4 transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Tiếp tục chọn sản phẩm</span>
                </Link>

                {/* Two-step Clear Cart Confirmation (Touch Targets >= 44px) */}
                <div>
                  {!isConfirmingClear ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(true)}
                      className="min-h-[44px] py-2 px-3 inline-flex items-center text-xs font-semibold text-[#737373] hover:text-[#b91c1c] transition-colors cursor-pointer select-none"
                    >
                      Xóa toàn bộ giỏ hàng
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 p-1.5 bg-[#fef2f2] border border-[#fecaca] rounded-xs text-xs">
                      <span className="font-semibold text-[#b91c1c]">Xóa toàn bộ?</span>
                      <button
                        type="button"
                        onClick={handleConfirmClear}
                        className="min-h-[44px] px-3 bg-[#b91c1c] text-white font-bold rounded-xs hover:bg-[#991b1b] transition-colors cursor-pointer inline-flex items-center"
                      >
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        className="min-h-[44px] px-3 bg-white text-[#525252] border border-[#e5e5e0] font-medium rounded-xs hover:bg-[#f5f5f3] transition-colors cursor-pointer inline-flex items-center"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary Column (Desktop: 35% / 4 cols, Sticky) */}
            <div className="lg:col-span-4 sticky lg:top-24">
              <CartSummary
                subtotal={subtotal}
                totalQuantity={totalQuantity}
                hasOutOfStock={hasOutOfStock}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;
