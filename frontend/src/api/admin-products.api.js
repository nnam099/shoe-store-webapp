import { apiRequest } from "./http.js";

function withQuery(path, query) {
  const parameters = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) parameters.set(key, String(value));
  });
  const search = parameters.toString();
  return search ? `${path}?${search}` : path;
}

export const adminProductsApi = {
  list(token, query) {
    return apiRequest(withQuery("/admin/products", query), { token });
  },
  options(token) {
    return apiRequest("/admin/products/options", { token });
  },
  detail(token, productId) {
    return apiRequest(`/admin/products/${productId}`, { token });
  },
  create(token, data, files) {
    const body = new FormData();
    body.append("data", JSON.stringify(data));
    files.forEach((file) => body.append("images", file));
    return apiRequest("/admin/products", { method: "POST", body, token });
  },
  update(token, productId, data) {
    return apiRequest(`/admin/products/${productId}`, { method: "PATCH", body: data, token });
  },
  remove(token, productId) {
    return apiRequest(`/admin/products/${productId}`, { method: "DELETE", token });
  },
  addImages(token, productId, files) {
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    return apiRequest(`/admin/products/${productId}/images`, { method: "POST", body, token });
  },
  reorderImages(token, productId, imageIds) {
    return apiRequest(`/admin/products/${productId}/images/order`, {
      method: "PUT",
      body: { imageIds },
      token,
    });
  },
  removeImage(token, productId, imageId) {
    return apiRequest(`/admin/products/${productId}/images/${imageId}`, {
      method: "DELETE",
      token,
    });
  },
  addVariant(token, productId, input) {
    return apiRequest(`/admin/products/${productId}/variants`, {
      method: "POST",
      body: input,
      token,
    });
  },
  updateVariant(token, productId, variantId, stockQuantity) {
    return apiRequest(`/admin/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      body: { stockQuantity },
      token,
    });
  },
  removeVariant(token, productId, variantId) {
    return apiRequest(`/admin/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
      token,
    });
  },
};
