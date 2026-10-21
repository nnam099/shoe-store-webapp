import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from '../utils/cartStorage';
import {
  createInitialHydratedItems,
  revalidateCartItems,
  calculateCartTotals,
} from '../services/cartService';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyCart from '../components/cart/EmptyCart';

/**
 * CartPage Component
 * Main cart experience for STEP/LAB storefront.
 * Features optimistic instant render from localStorage snapshot, safe asynchronous
 * catalog revalidation without silent data deletion, and race-condition guards.
 */
function CartPage() {
  // 1. Initial stored items read from localStorage
  const [storedItems, setStoredItems] = useState(() => getCart());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // 2. Hydrated items state: starts with optimistic snapshot, then updated by revalidation
  const [hydratedItems, setHydratedItems] = useState(() => createInitialHydratedItems(storedItems));
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);

  // Sequence ref to guard against stale async responses overwriting newer user actions
  const revalidationSeqRef = useRef(0);

  // 3. Revalidate cart items against live Catalog API
  const runRevalidation = useCallback((itemsToRevalidate) => {
    if (!Array.isArray(itemsToRevalidate) || itemsToRevalidate.length === 0) {
      setHydratedItems([]);
      setIsRevalidating(false);
      return;
    }

    const currentSeq = ++revalidationSeqRef.current;
    setIsRevalidating(true);

    revalidateCartItems(itemsToRevalidate)
      .then(({ hydratedItems: updatedItems, summary }) => {
        // Discard response if a newer user action started a revalidation
        if (currentSeq !== revalidationSeqRef.current) return;

        setHydratedItems(updatedItems);
        setIsRevalidating(false);

        // Determine user-friendly notice
        if (summary.networkFailed) {
          setCartNotice('Không thể kiểm tra tồn kho mới nhất do lỗi mạng. Dữ liệu giỏ hàng được giữ nguyên.');
        } else if (summary.priceChanges.length > 0) {
          setCartNotice('Giá một số sản phẩm đã được cập nhật theo giá hiện tại trên hệ thống.');
        } else if (summary.outOfStockItems.length > 0) {
          setCartNotice('Một số sản phẩm trong giỏ hàng hiện đã hết hàng.');
        } else if (summary.exceedingItems.length > 0) {
          setCartNotice('Số lượng một số sản phẩm vượt quá tồn kho có sẵn. Vui lòng điều chỉnh.');
        } else if (summary.unavailableItems.length > 0) {
          setCartNotice('Một số sản phẩm hiện không còn khả dụng trên hệ thống.');
        }
      })
      .catch(() => {
        if (currentSeq !== revalidationSeqRef.current) return;
        setIsRevalidating(false);
        setCartNotice('Không thể kết nối đến máy chủ để kiểm tra tồn kho.');
      });
  }, []);

  // Trigger revalidation when storedItems identity array changes
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Begin async revalidation when stored items change
    runRevalidation(storedItems);
  }, [storedItems, runRevalidation]);

  // Auto-dismiss notices after 6 seconds
  useEffect(() => {
    if (cartNotice) {
      const timer = setTimeout(() => {
        setCartNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [cartNotice]);

  // 4. Cross-tab and same-tab sync
  useEffect(() => {
    const handleSync = () => {
      const currentStored = getCart();
      setStoredItems(currentStored);
    };

    const handleStorage = (e) => {
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

  // 5. Totals calculation
  const totals = useMemo(() => {
    return calculateCartTotals(hydratedItems);
  }, [hydratedItems]);

  // Handlers
  const handleUpdateQuantity = (id, newQuantity, stockLimit) => {
    // Increment sequence to invalidate in-flight revalidations
    revalidationSeqRef.current++;
    const updated = updateCartItemQuantity(id, newQuantity, stockLimit || Infinity);
    setStoredItems(updated);
  };

  const handleRemoveItem = (id) => {
    revalidationSeqRef.current++;
    const updated = removeCartItem(id);
    setStoredItems(updated);
  };

  const handleConfirmClear = () => {
    revalidationSeqRef.current++;
    clearCart();
    setStoredItems([]);
    setHydratedItems([]);
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
          {storedItems.length > 0 && (
            <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
              {totals.totalQuantity} sản phẩm
            </span>
          )}
        </div>

        {/* Revalidation Notice */}
        {cartNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 p-3 bg-[#fefce8] border border-[#fef08a] text-[#854d0e] text-xs font-semibold rounded-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-[#ca8a04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{cartNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setCartNotice(null)}
              className="text-[#a16207] hover:text-[#713f12] text-xs font-bold"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Layout */}
        {storedItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#e5e5e0]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Sản phẩm trong giỏ
                </span>

                {isConfirmingClear ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#b91c1c]">Xóa toàn bộ?</span>
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      className="text-xs font-bold text-[#b91c1c] underline hover:text-[#7f1d1d] cursor-pointer"
                    >
                      Đồng ý
                    </button>
                    <span className="text-[#d4d4cb]">|</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(false)}
                      className="text-xs font-semibold text-[#737373] hover:text-[#121212] cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(true)}
                    className="text-xs font-semibold text-[#737373] hover:text-[#b91c1c] transition-colors cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div className="space-y-0">
                {hydratedItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            </div>

            {/* Cart Order Summary Sidebar */}
            <div className="lg:col-span-4 sticky lg:top-24">
              <CartSummary
                subtotal={totals.subtotal}
                totalQuantity={totals.totalQuantity}
                hasOutOfStock={totals.hasOutOfStock}
                hasUnavailable={totals.hasUnavailable}
                hasExceedingStock={totals.hasExceedingStock}
                hasUnverified={totals.hasUnverified}
                isRevalidating={isRevalidating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;
