import { apiRequest } from "./http.js";

function listPath(query) {
  const parameters = new URLSearchParams();
  if (query.q) parameters.set("q", query.q);
  for (const [key, values] of [
    ["brandId", query.brandIds],
    ["categoryId", query.categoryIds],
    ["sizeId", query.sizeIds],
    ["colorId", query.colorIds],
  ]) {
    values.forEach((value) => parameters.append(key, value));
  }
  if (query.minPrice !== "" && query.minPrice !== undefined) parameters.set("minPrice", query.minPrice);
  if (query.maxPrice !== "" && query.maxPrice !== undefined) parameters.set("maxPrice", query.maxPrice);
  parameters.set("sort", query.sort || "newest");
  parameters.set("page", String(query.page || 1));
  return `/products?${parameters.toString()}`;
}

export const productsApi = {
  list(query) {
    return apiRequest(listPath(query));
  },
  options() {
    return apiRequest("/products/options");
  },
  detail(slug) {
    return apiRequest(`/products/${encodeURIComponent(slug)}`);
  },
};
