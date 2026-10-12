function createApiError(response, data) {
  const error = new Error(
    data?.error?.message || 'Không thể hoàn tất yêu cầu đơn hàng lúc này.'
  );
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  return error;
}

async function memberOrderRequest(path, { method = 'GET', token } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw createApiError(response, data);
  return data?.data;
}

export function getMemberOrders(token, { page = 1, limit = 10 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return memberOrderRequest(`/member/orders?${query}`, { token });
}

export function getMemberOrder(token, orderCode) {
  return memberOrderRequest(`/member/orders/${encodeURIComponent(orderCode)}`, { token });
}

export function cancelMemberOrder(token, orderCode) {
  return memberOrderRequest(`/member/orders/${encodeURIComponent(orderCode)}/cancel`, {
    method: 'POST',
    token,
  });
}

export function confirmMemberOrder(token, orderCode) {
  return memberOrderRequest(
    `/member/orders/${encodeURIComponent(orderCode)}/confirm-received`,
    { method: 'POST', token }
  );
}
