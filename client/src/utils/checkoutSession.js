/**
 * STEP/LAB Order Confirmation Session Helper
 * Dedicated storage key: steplab_order_confirmation_v1
 * Stores strictly non-sensitive confirmation details in sessionStorage.
 * Never stores recipient PII (name, phone, address, notes).
 */

export const ORDER_CONFIRMATION_SESSION_KEY = 'steplab_order_confirmation_v1';

/**
 * Saves a non-sensitive confirmation snapshot upon HTTP 201 order creation.
 *
 * @param {Object} confirmation
 * @param {string} confirmation.orderCode
 * @param {string} confirmation.status
 * @param {number} confirmation.subtotal
 * @param {number} confirmation.shippingFee
 * @param {number} confirmation.total
 * @param {string} confirmation.paymentMethod
 * @param {Array} [confirmation.items]
 */
export function saveOrderConfirmation(confirmation) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const safeSnapshot = {
      orderCode: confirmation.orderCode,
      status: confirmation.status,
      subtotal: confirmation.subtotal,
      shippingFee: confirmation.shippingFee,
      total: confirmation.total,
      paymentMethod: confirmation.paymentMethod,
      items: Array.isArray(confirmation.items)
        ? confirmation.items.map((it) => ({
            productName: it.productName,
            colorwayName: it.colorwayName,
            size: it.size,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            lineTotal: it.lineTotal,
            colorwayImage: it.colorwayImage,
          }))
        : [],
      timestamp: Date.now(),
    };

    window.sessionStorage.setItem(
      ORDER_CONFIRMATION_SESSION_KEY,
      JSON.stringify(safeSnapshot)
    );
  } catch {
    // ignore sessionStorage errors
  }
}

/**
 * Retrieves the current order confirmation snapshot from sessionStorage.
 *
 * @returns {Object|null}
 */
export function getOrderConfirmation() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(ORDER_CONFIRMATION_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears the order confirmation from sessionStorage.
 */
export function clearOrderConfirmation() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.removeItem(ORDER_CONFIRMATION_SESSION_KEY);
  } catch {
    // ignore
  }
}
