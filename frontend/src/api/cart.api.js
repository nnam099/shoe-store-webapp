import { apiRequest } from "./http.js";

export const cartApi = {
  validateGuestCart(items) {
    return apiRequest("/cart/validate", { method: "POST", body: { items } });
  },

  getCart(token) {
    return apiRequest("/cart", { token });
  },

  mergeGuestCart(token, items) {
    return apiRequest("/cart/merge", { method: "POST", body: { items }, token });
  },

  addItem(token, input) {
    return apiRequest("/cart/items", { method: "POST", body: input, token });
  },

  updateItem(token, productVariantId, quantity) {
    return apiRequest(`/cart/items/${encodeURIComponent(productVariantId)}`, {
      method: "PATCH",
      body: { quantity },
      token,
    });
  },

  deleteItem(token, productVariantId) {
    return apiRequest(`/cart/items/${encodeURIComponent(productVariantId)}`, {
      method: "DELETE",
      token,
    });
  },
};
