/**
 * STEP/LAB Admin API Service
 * Centralized client for all /api/admin/* endpoints.
 * Handles Authorization header, response envelope unwrapping, error normalization,
 * and multipart image uploads.
 *
 * All functions throw structured errors with .status and .code properties.
 * Callers should catch and handle 401 UNAUTHORIZED by clearing the admin session.
 */

function createAdminError(response, data) {
  const message =
    data?.error?.message || response.statusText || 'Yêu cầu quản trị thất bại.';
  const error = new Error(message);
  error.status = response.status;
  error.code = data?.error?.code || 'UNKNOWN_ERROR';
  error.issues = data?.error?.issues || [];
  error.details = data?.error?.details || null;
  return error;
}

async function adminRequest(path, { method = 'GET', token, body, isMultipart = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isMultipart && body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`/api/admin${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: isMultipart ? body : JSON.stringify(body) } : {}),
    });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
    error.code = 'NETWORK_ERROR';
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw createAdminError(response, data);
  return data?.data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function adminLogin(payload) {
  return adminRequest('/auth/login', { method: 'POST', body: payload });
}

export function adminGetMe(token) {
  return adminRequest('/auth/me', { token });
}

export function adminChangePassword(token, payload) {
  return adminRequest('/auth/change-password', { method: 'POST', token, body: payload });
}

// ─── Admin Accounts ───────────────────────────────────────────────────────────

export function adminListAccounts(token, params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.q) q.set('q', params.q);
  if (params.isActive !== undefined && params.isActive !== '') q.set('isActive', String(params.isActive));
  if (params.sort) q.set('sort', params.sort);
  const qs = q.toString();
  return adminRequest(`/accounts${qs ? `?${qs}` : ''}`, { token });
}

export function adminGetAccount(token, adminId) {
  return adminRequest(`/accounts/${adminId}`, { token });
}

export function adminCreateAccount(token, payload) {
  return adminRequest('/accounts', { method: 'POST', token, body: payload });
}

export function adminUpdateAccount(token, adminId, payload) {
  return adminRequest(`/accounts/${adminId}`, { method: 'PATCH', token, body: payload });
}

export function adminResetAccountPassword(token, adminId, payload) {
  return adminRequest(`/accounts/${adminId}/reset-password`, { method: 'POST', token, body: payload });
}

export function adminDeleteAccount(token, adminId) {
  return adminRequest(`/accounts/${adminId}`, { method: 'DELETE', token });
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export function adminListBrands(token, params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.q) q.set('q', params.q);
  if (params.isActive !== undefined && params.isActive !== '') q.set('isActive', String(params.isActive));
  if (params.sort) q.set('sort', params.sort);
  const qs = q.toString();
  return adminRequest(`/brands${qs ? `?${qs}` : ''}`, { token });
}

export function adminGetBrand(token, brandId) {
  return adminRequest(`/brands/${brandId}`, { token });
}

export function adminCreateBrand(token, payload) {
  return adminRequest('/brands', { method: 'POST', token, body: payload });
}

export function adminUpdateBrand(token, brandId, payload) {
  return adminRequest(`/brands/${brandId}`, { method: 'PATCH', token, body: payload });
}

export function adminDeleteBrand(token, brandId) {
  return adminRequest(`/brands/${brandId}`, { method: 'DELETE', token });
}

export function adminUploadBrandLogo(token, brandId, file) {
  const form = new FormData();
  form.append('image', file);
  return adminRequest(`/brands/${brandId}/logo`, { method: 'POST', token, body: form, isMultipart: true });
}

export function adminDeleteBrandLogo(token, brandId) {
  return adminRequest(`/brands/${brandId}/logo`, { method: 'DELETE', token });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function adminListCategories(token, params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.q) q.set('q', params.q);
  if (params.isActive !== undefined && params.isActive !== '') q.set('isActive', String(params.isActive));
  if (params.sort) q.set('sort', params.sort);
  const qs = q.toString();
  return adminRequest(`/categories${qs ? `?${qs}` : ''}`, { token });
}

export function adminGetCategory(token, categoryId) {
  return adminRequest(`/categories/${categoryId}`, { token });
}

export function adminCreateCategory(token, payload) {
  return adminRequest('/categories', { method: 'POST', token, body: payload });
}

export function adminUpdateCategory(token, categoryId, payload) {
  return adminRequest(`/categories/${categoryId}`, { method: 'PATCH', token, body: payload });
}

export function adminDeleteCategory(token, categoryId) {
  return adminRequest(`/categories/${categoryId}`, { method: 'DELETE', token });
}

// ─── Catalog Meta ─────────────────────────────────────────────────────────────

export function adminGetCatalogMeta(token) {
  return adminRequest('/catalog/meta', { token });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function adminListProducts(token, params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.q) q.set('q', params.q);
  if (params.isActive !== undefined && params.isActive !== '') q.set('isActive', String(params.isActive));
  if (params.isFeatured !== undefined && params.isFeatured !== '') q.set('isFeatured', String(params.isFeatured));
  if (params.brandId) q.set('brandId', String(params.brandId));
  if (params.categoryId) q.set('categoryId', String(params.categoryId));
  if (params.sort) q.set('sort', params.sort);
  const qs = q.toString();
  return adminRequest(`/products${qs ? `?${qs}` : ''}`, { token });
}

export function adminGetProduct(token, productId) {
  return adminRequest(`/products/${productId}`, { token });
}

export function adminCreateProduct(token, payload) {
  return adminRequest('/products', { method: 'POST', token, body: payload });
}

export function adminUpdateProduct(token, productId, payload) {
  return adminRequest(`/products/${productId}`, { method: 'PATCH', token, body: payload });
}

export function adminDeleteProduct(token, productId) {
  return adminRequest(`/products/${productId}`, { method: 'DELETE', token });
}

// ─── Colorways ────────────────────────────────────────────────────────────────

export function adminGetColorway(token, colorwayId) {
  return adminRequest(`/colorways/${colorwayId}`, { token });
}

export function adminCreateColorway(token, productId, payload) {
  return adminRequest(`/products/${productId}/colorways`, { method: 'POST', token, body: payload });
}

export function adminUpdateColorway(token, colorwayId, payload) {
  return adminRequest(`/colorways/${colorwayId}`, { method: 'PATCH', token, body: payload });
}

export function adminSetDefaultColorway(token, colorwayId) {
  return adminRequest(`/colorways/${colorwayId}/set-default`, { method: 'POST', token });
}

export function adminDeleteColorway(token, colorwayId) {
  return adminRequest(`/colorways/${colorwayId}`, { method: 'DELETE', token });
}

// ─── Images ───────────────────────────────────────────────────────────────────

export function adminUploadColorwayImage(token, colorwayId, file, displayOrder, isThumbnail) {
  const form = new FormData();
  form.append('image', file);
  if (displayOrder !== undefined) form.append('displayOrder', String(displayOrder));
  if (isThumbnail !== undefined) form.append('isThumbnail', isThumbnail ? 'true' : 'false');
  return adminRequest(`/colorways/${colorwayId}/images`, { method: 'POST', token, body: form, isMultipart: true });
}

export function adminReorderColorwayImages(token, colorwayId, payload) {
  return adminRequest(`/colorways/${colorwayId}/images/order`, { method: 'PUT', token, body: payload });
}

export function adminDeleteImage(token, imageId) {
  return adminRequest(`/images/${imageId}`, { method: 'DELETE', token });
}

// ─── Variants & Stock ────────────────────────────────────────────────────────

export function adminCreateVariant(token, colorwayId, payload) {
  return adminRequest(`/colorways/${colorwayId}/variants`, { method: 'POST', token, body: payload });
}

export function adminUpdateVariant(token, variantId, payload) {
  return adminRequest(`/variants/${variantId}`, { method: 'PATCH', token, body: payload });
}

export function adminUpdateVariantStock(token, variantId, payload) {
  return adminRequest(`/variants/${variantId}/stock`, { method: 'PATCH', token, body: payload });
}

export function adminDeleteVariant(token, variantId) {
  return adminRequest(`/variants/${variantId}`, { method: 'DELETE', token });
}
