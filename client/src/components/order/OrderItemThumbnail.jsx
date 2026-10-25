import { useState } from 'react';
import { getAssetUrl } from '../../config/site';

export default function OrderItemThumbnail({
  src,
  alt,
  imageClassName,
  placeholderClassName,
  loading = 'lazy',
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const canDisplayImage = typeof src === 'string' && src.trim() && failedSrc !== src;

  if (!canDisplayImage) {
    return (
      <span className={placeholderClassName} aria-label={`Không có ảnh cho ${alt}`}>
        STEP/LAB
      </span>
    );
  }

  return (
    <img
      src={getAssetUrl(src)}
      alt={alt}
      className={imageClassName}
      loading={loading}
      onError={() => setFailedSrc(src)}
    />
  );
}
