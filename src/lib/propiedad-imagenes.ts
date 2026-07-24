import type { PropiedadImagenItem } from '@/types/panel';

export { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';

export function imagenesItemsToUrls(items: PropiedadImagenItem[]): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => i.url).filter(Boolean);
}
