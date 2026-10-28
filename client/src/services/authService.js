function createApiError(response, data) {
  const error = new Error(
    data?.error?.message || 'Không thể hoàn tất yêu cầu xác thực lúc này.'
  );
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  error.details = data?.error?.details || null;
  return error;
}

async function authRequest(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

export function registerMember(payload) {
  return authRequest('/auth/register', { method: 'POST', body: payload });
}

export function loginMember(payload) {
  return authRequest('/auth/login', { method: 'POST', body: payload });
}

export function getCurrentMember(token) {
  return authRequest('/auth/me', { token });
}

export function updateMemberProfile(token, payload) {
  return authRequest('/auth/me', { method: 'PATCH', token, body: payload });
}

export function changeMemberPassword(token, payload) {
  return authRequest('/auth/change-password', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function forgotMemberPassword(payload) {
  return authRequest('/auth/password/forgot', { method: 'POST', body: payload });
}

export function loginGoogle(payload) {
  return authRequest('/auth/google', { method: 'POST', body: payload });
}

export function linkGoogle(token, payload) {
  return authRequest('/auth/google/link', { method: 'POST', token, body: payload });
}

export function resetMemberPassword(payload) {
  return authRequest('/auth/password/reset', { method: 'POST', body: payload });
}

export function sendPasswordSetupOtp(token) {
  return authRequest('/auth/password/setup/otp/send', { method: 'POST', token, body: {} });
}

export function setupMemberPassword(token, payload) {
  return authRequest('/auth/password/setup', { method: 'POST', token, body: payload });
}
