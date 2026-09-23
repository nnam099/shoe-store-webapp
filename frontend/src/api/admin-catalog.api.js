import { apiRequest } from "./http.js";

function queryString(query) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== "" && value !== undefined && value !== null) parameters.set(key, value);
  }
  const value = parameters.toString();
  return value ? `?${value}` : "";
}

export const adminCatalogApi = {
  list(token, resource, query) {
    return apiRequest(`/admin/catalog/${resource}${queryString(query)}`, { token });
  },
  create(token, resource, input) {
    return apiRequest(`/admin/catalog/${resource}`, { method: "POST", body: input, token });
  },
  update(token, resource, id, input) {
    return apiRequest(`/admin/catalog/${resource}/${id}`, {
      method: "PATCH",
      body: input,
      token,
    });
  },
  remove(token, resource, id) {
    return apiRequest(`/admin/catalog/${resource}/${id}`, { method: "DELETE", token });
  },
};
