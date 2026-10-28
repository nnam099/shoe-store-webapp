function createApiError(response, data) {
  const error = new Error(data?.error?.message || response.statusText || 'Yêu cầu không thành công');
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  error.details = data?.error?.details || null;
  return error;
}

async function checkoutRequest(path, { method = 'GET', token, guestToken, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (guestToken) headers['X-Checkout-Token'] = guestToken;
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw createApiError(response, data);
  return data?.data;
}

export function getCheckoutQuote(items) {
  return checkoutRequest('/checkout/quote', { method: 'POST', body: { items } });
}

export function createCheckoutIntent(payload, { token } = {}) {
  return checkoutRequest('/checkout/intents', { method: 'POST', token, body: payload });
}

export function getCheckoutIntent(intentId, credentials = {}) {
  return checkoutRequest(`/checkout/intents/${encodeURIComponent(intentId)}`, credentials);
}

export function updateCheckoutIntent(intentId, payload, credentials = {}) {
  return checkoutRequest(`/checkout/intents/${encodeURIComponent(intentId)}`, {
    method: 'PATCH', body: payload, ...credentials,
  });
}

export function sendCheckoutOtp(intentId, credentials = {}) {
  return checkoutRequest(`/checkout/intents/${encodeURIComponent(intentId)}/email-otp/send`, {
    method: 'POST', body: {}, ...credentials,
  });
}

export function verifyCheckoutOtp(intentId, payload, credentials = {}) {
  return checkoutRequest(`/checkout/intents/${encodeURIComponent(intentId)}/email-otp/verify`, {
    method: 'POST', body: payload, ...credentials,
  });
}

export function confirmCodOrder(intentId, acceptedQuoteVersion, credentials = {}) {
  return checkoutRequest(`/checkout/intents/${encodeURIComponent(intentId)}/confirm-cod`, {
    method: 'POST', body: { acceptedQuoteVersion }, ...credentials,
  });
}
