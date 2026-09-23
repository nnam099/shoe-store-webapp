import { AppError } from "../errors/app-error.js";

export function mapValidationFields(issues) {
  const fields = {};

  for (const issue of issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "_root";

    if (!fields[field]) {
      fields[field] = issue.message;
    }
  }

  return fields;
}

export function validate(schema, target = "body") {
  return function validationMiddleware(request, _response, next) {
    const result = schema.safeParse(request[target]);

    if (!result.success) {
      next(
        new AppError({
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Dữ liệu gửi lên không hợp lệ.",
          fields: mapValidationFields(result.error.issues),
        }),
      );
      return;
    }

    request.validated = request.validated ?? {};
    request.validated[target] = result.data;

    if (target === "body") {
      request.body = result.data;
    }
    next();
  };
}
