'use client';

import { useState } from 'react';

export const PROPERTY_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop';

export function resolvePropertyImageSource(
  source: string | null | undefined,
  fallback = PROPERTY_IMAGE_PLACEHOLDER,
): string {
  return source?.trim() || fallback;
}

type PropertyImageProps = {
  source: string | null | undefined;
  alt: string;
  className: string;
};

export function PropertyImage({ source, alt, className }: PropertyImageProps) {
  const resolvedSource = resolvePropertyImageSource(source);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const visibleSource =
    failedSource === resolvedSource ? PROPERTY_IMAGE_PLACEHOLDER : resolvedSource;

  return (
    // Native img is intentional: public DTOs may contain approved legacy external URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={visibleSource}
      alt={alt}
      className={className}
      onError={() => setFailedSource(resolvedSource)}
    />
  );
}
