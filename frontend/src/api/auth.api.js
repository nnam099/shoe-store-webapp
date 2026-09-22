import { apiRequest } from "./http.js";

export const authApi = {
  register(input) {
    return apiRequest("/auth/register", { method: "POST", body: input });
  },
  loginCustomer(input) {
    return apiRequest("/auth/login", { method: "POST", body: input });
  },
  getSession(token) {
    return apiRequest("/auth/session", { token });
  },
};
