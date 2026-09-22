import { apiRequest } from "./http.js";

export const cartApi = {
  mergeGuestCart(token, items) {
    return apiRequest("/cart/merge", { method: "POST", body: { items }, token });
  },
};
