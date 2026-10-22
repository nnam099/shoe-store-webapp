import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  getManagedUploadDirectory,
  MANAGED_UPLOAD_PUBLIC_PREFIX,
  MANAGED_UPLOAD_ROOT,
} from '../config/uploads.js';
import { AppError } from './errors.js';

const AVIF_BRANDS = new Set(['avif', 'avis']);

function hasAvifFileTypeBox(buffer) {
  if (buffer.length < 16 || buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false;

  const boxSize = buffer.readUInt32BE(0);
  let brandsOffset = 8;
  let boxEnd;

  if (boxSize === 0) {
    boxEnd = buffer.length;
  } else if (boxSize === 1) {
    if (buffer.length < 24) return false;
    const largeBoxSize = buffer.readBigUInt64BE(8);
    if (largeBoxSize > BigInt(buffer.length) || largeBoxSize < 24n) return false;
    brandsOffset = 16;
    boxEnd = Number(largeBoxSize);
  } else {
    if (boxSize < 16 || boxSize > buffer.length) return false;
    boxEnd = boxSize;
  }

  if (boxEnd - brandsOffset < 8) return false;
  if (AVIF_BRANDS.has(buffer.subarray(brandsOffset, brandsOffset + 4).toString('ascii'))) {
    return true;
  }

  for (let offset = brandsOffset + 8; offset + 4 <= boxEnd; offset += 4) {
    if (AVIF_BRANDS.has(buffer.subarray(offset, offset + 4).toString('ascii'))) return true;
  }
  return false;
}

function detectImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'webp';
  if (hasAvifFileTypeBox(buffer)) return 'avif';
  return null;
}

export function validateImageFile(file) {
  if (!file?.buffer) throw new AppError('Image file is required.', 400, 'VALIDATION_ERROR');
  const extension = detectImageExtension(file.buffer);
  const expectedMime = extension === 'jpg' ? 'image/jpeg' : extension ? `image/${extension}` : null;
  if (!extension || file.mimetype !== expectedMime) {
    throw new AppError('Image content does not match a supported format.', 415, 'INVALID_IMAGE_TYPE');
  }
  return extension;
}

export async function saveManagedImage(file, kind) {
  const extension = validateImageFile(file);
  const directory = getManagedUploadDirectory(kind);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  const absolutePath = path.join(directory, filename);
  await writeFile(absolutePath, file.buffer, { flag: 'wx' });
  return {
    absolutePath,
    imageUrl: `${MANAGED_UPLOAD_PUBLIC_PREFIX}/${kind}/${filename}`,
  };
}

export function managedPathFromUrl(imageUrl) {
  const managedPattern = new RegExp(
    `^${MANAGED_UPLOAD_PUBLIC_PREFIX}/(brands|products)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(?:jpg|png|webp|avif)$`
  );
  if (typeof imageUrl !== 'string' || !managedPattern.test(imageUrl)) {
    return null;
  }
  const relative = imageUrl.slice(MANAGED_UPLOAD_PUBLIC_PREFIX.length + 1);
  const absolute = path.resolve(MANAGED_UPLOAD_ROOT, relative);
  const relativeCheck = path.relative(MANAGED_UPLOAD_ROOT, absolute);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) return null;
  return absolute;
}

export async function deleteManagedImage(imageUrl) {
  const absolutePath = managedPathFromUrl(imageUrl);
  if (!absolutePath) return false;
  try {
    await unlink(absolutePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}
