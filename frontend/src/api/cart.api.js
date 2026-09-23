import { apiRequest } from "./http.js";

export const cartApi = {
  mergeGuestCart(token, items) {
    return apiRequest("/cart/merge", { method: "POST", body: { items }, token });
  },

  addItem(token, input) {
    return apiRequest("/cart/items", { method: "POST", body: input, token });
  },
};
