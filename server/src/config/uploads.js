import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const defaultUploadRoot = fileURLToPath(new URL('../../uploads', import.meta.url));

export const MANAGED_UPLOAD_ROOT = path.resolve(
  process.env.PRODUCT_IMAGE_UPLOAD_DIR?.trim() || defaultUploadRoot
);
export const MANAGED_UPLOAD_PUBLIC_PREFIX = '/api/uploads';
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function getManagedUploadDirectory(kind) {
  if (!['brands', 'products'].includes(kind)) throw new Error('Invalid managed upload kind.');
  return path.join(MANAGED_UPLOAD_ROOT, kind);
}
