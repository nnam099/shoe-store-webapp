/**
 * STEP/LAB Checkout API Service
 * Centralizes checkout quote and guest order placement HTTP calls.
 * Communicates with backend endpoints (/api/checkout/quote, /api/orders).
 */

/**
 * Normalizes HTTP error responses into structured Error objects.
 */
function createApiError(response, data) {
  const errorObj = new Error(
    data?.error?.message || response.statusText || 'Yêu cầu không thành công'
  );
  errorObj.status = response.status;
  errorObj.code = data?.error?.code || 'UNKNOWN_ERROR';
  errorObj.issues = data?.error?.issues || [];
  errorObj.details = data?.error?.details || null;
  return errorObj;
}

/**
 * Requests an authoritative server quote for items in cart.
 *
 * @param {Array<{ productSlug: string, colorwaySlug: string, size: string, quantity: number }>} items
 * @returns {Promise<{ items: Array, subtotal: number, shippingFee: number, total: number, paymentMethod: string }>}
 */
export async function getCheckoutQuote(items) {
  const response = await fetch('/api/checkout/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return data?.data;
}

/**
 * Places a guest order with server-confirmed prices and shipping fee.
 *
 * @param {Object} orderPayload
 * @param {string} orderPayload.receiverName
 * @param {string} orderPayload.receiverPhone
 * @param {string} orderPayload.receiverAddress
 * @param {string|null} [orderPayload.note]
 * @param {Array<{ productSlug: string, colorwaySlug: string, size: string, quantity: number, expectedUnitPrice: number }>} orderPayload.items
 * @param {number} orderPayload.expectedShippingFee
 * @returns {Promise<{ orderCode: string, status: string, subtotal: number, shippingFee: number, total: number, paymentMethod: string, items: Array }>}
 */
export async function createGuestOrder(orderPayload) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return data?.data;
}
