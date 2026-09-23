import multer from "multer";

import { AppError } from "../errors/app-error.js";
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_IMAGE_SIZE } from "../utils/product-image.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PRODUCT_IMAGES,
    fileSize: MAX_PRODUCT_IMAGE_SIZE,
    fields: 2,
    fieldSize: 100 * 1024,
  },
});

function mapUploadError(error) {
  if (!(error instanceof multer.MulterError)) {
    return error;
  }

  const messages = {
    LIMIT_FILE_SIZE: "Mỗi ảnh không được vượt quá 5 MiB.",
    LIMIT_FILE_COUNT: "Mỗi lần chỉ được gửi tối đa 8 ảnh.",
    LIMIT_UNEXPECTED_FILE: "Trường upload ảnh không hợp lệ hoặc có quá 8 ảnh.",
    LIMIT_FIELD_VALUE: "Dữ liệu sản phẩm gửi kèm quá lớn.",
    LIMIT_FIELD_COUNT: "Biểu mẫu upload có quá nhiều trường.",
  };
  const message = messages[error.code] ?? "Không thể xử lý file ảnh tải lên.";

  return new AppError({
    statusCode: 400,
    code: "INVALID_IMAGE_UPLOAD",
    message,
    fields: { images: message },
  });
}

export function uploadProductImages(request, response, next) {
  upload.array("images", MAX_PRODUCT_IMAGES)(request, response, (error) => {
    next(error ? mapUploadError(error) : undefined);
  });
}
