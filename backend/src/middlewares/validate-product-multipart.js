import { AppError } from "../errors/app-error.js";
import { createProductSchema, parseMultipartProductData } from "../schemas/admin-product.schemas.js";
import { mapValidationFields } from "./validate.js";

export function validateProductMultipart(request, _response, next) {
  const parsedJson = parseMultipartProductData(request.body.data);

  if (!parsedJson.success) {
    next(
      new AppError({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: parsedJson.error,
        fields: { data: parsedJson.error },
      }),
    );
    return;
  }

  const result = createProductSchema.safeParse(parsedJson.value);
  if (!result.success) {
    next(
      new AppError({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Dữ liệu sản phẩm không hợp lệ.",
        fields: mapValidationFields(result.error.issues),
      }),
    );
    return;
  }

  request.productData = result.data;
  next();
}
