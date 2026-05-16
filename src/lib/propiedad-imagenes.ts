import { extractPublicIdFromCloudinaryUrl } from '@/lib/cloudinary';
import type { PropiedadImagenItem } from '@/types/panel';

export { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';

export function imagenesItemsToUrls(items: PropiedadImagenItem[]): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => i.url).filter(Boolean);
}

/** Para deletes Cloudinary: prioriza `public_id` guardado; si falta, parsea la URL. */
export function collectPublicIdsForDeletion(items: PropiedadImagenItem[]): string[] {
  const ids = new Set<string>();
  for (const it of items) {
    const trimmed = it.public_id?.trim();
    if (trimmed) {
      ids.add(trimmed);
      continue;
    }
    const fromUrl = extractPublicIdFromCloudinaryUrl(it.url);
    if (fromUrl) ids.add(fromUrl);
  }
  return [...ids];
}
