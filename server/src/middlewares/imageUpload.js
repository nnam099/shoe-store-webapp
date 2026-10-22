import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../config/uploads.js';
import { AppError } from '../utils/errors.js';

const acceptedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 4 },
  fileFilter(req, file, callback) {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      callback(new AppError('Only JPEG, PNG and WebP images are supported.', 415, 'INVALID_IMAGE_TYPE'));
      return;
    }
    callback(null, true);
  },
});

export function uploadSingleImage(req, res, next) {
  parser.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Image exceeds the 8 MB limit.', 413, 'IMAGE_TOO_LARGE'));
    }
    if (error instanceof multer.MulterError) {
      return next(new AppError('Invalid image upload request.', 400, 'VALIDATION_ERROR'));
    }
    return next(error);
  });
}
