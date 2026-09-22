export function errorHandler(error, _request, response, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const code = typeof error.code === "string" ? error.code : "INTERNAL_SERVER_ERROR";
  const message =
    statusCode < 500 && typeof error.message === "string"
      ? error.message
      : statusCode === 503
        ? "Dịch vụ tạm thời không khả dụng."
        : "Đã xảy ra lỗi hệ thống.";

  const publicError = { code, message };

  if (statusCode < 500 && error.fields && typeof error.fields === "object") {
    publicError.fields = error.fields;
  }

  response.status(statusCode).json({ error: publicError });
}
