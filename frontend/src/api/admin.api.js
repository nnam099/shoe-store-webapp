import { apiRequest } from "./http.js";

export const adminApi = {
  getIndex(token) {
    return apiRequest("/admin", { token });
  },
};
