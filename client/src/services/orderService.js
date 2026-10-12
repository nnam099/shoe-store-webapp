/**
 * STEP/LAB Order API Service
 * Centralizes public order lookup and lifecycle HTTP calls.
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
  return errorObj;
}

/**
 * Looks up a guest order by orderCode and receiverPhone.
 *
 * @param {Object} params
 * @param {string} params.orderCode
 * @param {string} params.receiverPhone
 * @returns {Promise<Object>} Public serialized order object
 */
export async function lookupGuestOrder({ orderCode, receiverPhone }) {
  const response = await fetch('/api/orders/lookup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderCode: orderCode?.trim(),
      receiverPhone: receiverPhone?.trim(),
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return data?.data;
}

/**
 * Cancels a guest order by orderCode with receiverPhone verification.
 *
 * @param {Object} params
 * @param {string} params.orderCode
 * @param {string} params.receiverPhone
 * @returns {Promise<{ orderCode: string, status: string, cancelledAt: string, cancellable: boolean }>}
 */
export async function cancelGuestOrder({ orderCode, receiverPhone }) {
  const normalizedCode = encodeURIComponent(orderCode?.trim() || '');
  const response = await fetch(`/api/orders/${normalizedCode}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiverPhone: receiverPhone?.trim(),
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return data?.data;
}

/**
 * Confirms receipt of an ownership-verified public order.
 *
 * @param {Object} params
 * @param {string} params.orderCode
 * @param {string} params.receiverPhone
 */
export async function confirmGuestOrderReceived({ orderCode, receiverPhone }) {
  const normalizedCode = encodeURIComponent(orderCode?.trim() || '');
  const response = await fetch(`/api/orders/${normalizedCode}/confirm-received`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiverPhone: receiverPhone?.trim(),
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return data?.data;
}
