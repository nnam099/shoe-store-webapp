import { AppError } from "../errors/app-error.js";

export function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles);

  return function roleAuthorization(request, _response, next) {
    if (!request.auth) {
      next(
        new AppError({
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Bạn cần đăng nhập để tiếp tục.",
        }),
      );
      return;
    }

    if (!allowed.has(request.auth.role)) {
      next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "Bạn không có quyền thực hiện thao tác này.",
        }),
      );
      return;
    }

    next();
  };
}
