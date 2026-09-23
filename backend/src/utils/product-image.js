import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fileTypeFromBuffer } from "file-type";

import { AppError } from "../errors/app-error.js";

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function invalidImageError(message) {
  return new AppError({
    statusCode: 400,
    code: "INVALID_IMAGE",
    message,
    fields: { images: message },
  });
}

export async function inspectProductImage(file) {
  if (!file?.buffer || file.buffer.length === 0) {
    throw invalidImageError("File ảnh không được để trống.");
  }

  if (file.buffer.length > MAX_PRODUCT_IMAGE_SIZE) {
    throw invalidImageError("Mỗi ảnh không được vượt quá 5 MiB.");
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = detected ? allowedImageTypes.get(detected.mime) : null;

  if (!extension) {
    throw invalidImageError("Ảnh phải có định dạng JPG, PNG hoặc WebP hợp lệ.");
  }

  return { extension, mime: detected.mime };
}

export async function writeProductImage(file, uploadDirectory) {
  const { extension } = await inspectProductImage(file);
  await mkdir(uploadDirectory, { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const filename = `${randomUUID()}.${extension}`;

    try {
      await writeFile(join(uploadDirectory, filename), file.buffer, { flag: "wx" });
      return filename;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new AppError({
    statusCode: 500,
    code: "IMAGE_WRITE_FAILED",
    message: "Không thể lưu ảnh sản phẩm.",
  });
}

export function toPublicImagePath(filename) {
  return `/uploads/${encodeURIComponent(filename)}`;
}
