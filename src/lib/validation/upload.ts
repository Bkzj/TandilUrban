import { z } from 'zod';

import { identifierSchema } from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';

const MIME_SIGNATURES = {
  'image/jpeg': (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes: Uint8Array) =>
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((expected, index) => bytes[index] === expected),
  'image/webp': (bytes: Uint8Array) =>
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP',
} as const;

export type AllowedImageMime = keyof typeof MIME_SIGNATURES;

export function parseImageDataUrl(
  value: string,
  maximumDecodedBytes: number,
  allowedMimes: readonly AllowedImageMime[] = ['image/jpeg', 'image/png', 'image/webp'],
): { bytes: Uint8Array; mimeType: AllowedImageMime; base64: string } | null {
  const maximumEncodedChars = Math.ceil(maximumDecodedBytes / 3) * 4;
  if (value.length > maximumEncodedChars + 128) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(value);
  if (!match) return null;
  const mimeType = match[1];
  if (!allowedMimes.includes(mimeType as AllowedImageMime)) return null;
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const approximateBytes = Math.floor((base64.length * 3) / 4) - padding;
  if (approximateBytes <= 0 || approximateBytes > maximumDecodedBytes) return null;
  const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
  const typedMime = mimeType as AllowedImageMime;
  if (bytes.byteLength !== approximateBytes || !MIME_SIGNATURES[typedMime](bytes)) return null;
  return { bytes, mimeType: typedMime, base64 };
}

export const uploadBodySchema = z
  .object({
    file: z.string().min(1).max(Math.ceil(REQUEST_LIMITS.uploadImageBytes / 3) * 4 + 128),
    propertyId: identifierSchema.optional(),
    uploadToken: z.string().trim().min(32).max(1_024).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.propertyId) === Boolean(value.uploadToken), {
    message: 'El identificador y el permiso de subida deben enviarse juntos.',
    path: ['propertyId'],
  });

export const recentPropertiesSchema = z
  .object({
    ids: z
      .array(identifierSchema)
      .max(REQUEST_LIMITS.recentPropertyIds)
      .transform((ids) => [...new Set(ids)]),
  })
  .strict();
