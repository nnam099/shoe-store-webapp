const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export class ApiError extends Error {
  constructor({ status, code, message, fields }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
  }
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload.error?.code ?? "REQUEST_FAILED",
      message: payload.error?.message ?? "Không thể kết nối tới máy chủ.",
      fields: payload.error?.fields,
    });
  }

  return payload;
}

export function resolveApiAssetUrl(path) {
  if (!path) return null;
  const apiUrl = new URL(API_BASE_URL, globalThis.location?.origin ?? "http://localhost");
  return new URL(path, apiUrl.origin).toString();
}
