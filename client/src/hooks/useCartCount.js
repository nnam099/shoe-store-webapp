import { useState, useEffect } from 'react';
import { getCartCount, CART_STORAGE_KEY, CART_UPDATED_EVENT } from '../utils/cartStorage.js';

/**
 * useCartCount Custom Hook
 * Provides reactive cart item count (total pairs) for Header and other consumers.
 * Syncs seamlessly across same-tab custom events and cross-tab storage events.
 * 
 * @returns {number} Total pairs of shoes currently in cart
 */
export function useCartCount() {
  const [count, setCount] = useState(() => getCartCount());

  useEffect(() => {
    const handleUpdate = () => {
      setCount(getCartCount());
    };

    const handleStorage = (e) => {
      // Only react if our cart storage key was updated or cleared
      if (!e.key || e.key === CART_STORAGE_KEY) {
        setCount(getCartCount());
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return count;
}

export default useCartCount;
