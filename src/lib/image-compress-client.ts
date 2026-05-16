'use client';

/**
 * Comprime una imagen (URL blob, data: o http(s)) a JPEG base64 puro (sin prefijo data:).
 */
export async function imageUrlToCompressedJpegBase64(
  url: string,
  maxSide = 512,
  quality = 0.6
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    let { width, height } = bitmap;
    const scale = Math.min(1, maxSide / Math.max(width, height, 1));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.slice(comma + 1) : null;
  } catch {
    return null;
  }
}
