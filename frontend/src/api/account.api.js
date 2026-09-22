import { apiRequest } from "./http.js";

export const accountApi = {
  getProfile(token) {
    return apiRequest("/account/profile", { token });
  },
  updateProfile(token, input) {
    return apiRequest("/account/profile", { method: "PATCH", body: input, token });
  },
  changePassword(token, input) {
    return apiRequest("/account/password", { method: "PUT", body: input, token });
  },
};
