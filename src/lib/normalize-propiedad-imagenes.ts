import type { PropiedadImagenItem } from '@/types/panel';

/** Normaliza lo guardado en Prisma (`Json`) o legacy mixto. Sin deps de Cloudinary (uso seguro en Client Components). */
export function normalizePropiedadImagenesDb(raw: unknown): PropiedadImagenItem[] {
  let data: unknown = raw;

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      data = JSON.parse(s) as unknown;
    } catch {
      return [{ url: s, public_id: null, categoria: 'Sin clasificar' }];
    }
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (typeof o.url === 'string') {
      data = [data];
    } else {
      return [];
    }
  }

  if (!Array.isArray(data)) return [];

  const out: PropiedadImagenItem[] = [];

  for (const item of data) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (url) {
        out.push({
          url,
          public_id: null,
          categoria: 'Sin clasificar',
        });
      }
      continue;
    }

    if (item && typeof item === 'object' && 'url' in item) {
      const o = item as Record<string, unknown>;
      const url = typeof o.url === 'string' ? o.url.trim() : '';
      if (!url) continue;
      out.push({
        url,
        public_id: typeof o.public_id === 'string' ? o.public_id : null,
        categoria:
          typeof o.categoria === 'string' && o.categoria.trim() !== ''
            ? o.categoria.trim()
            : 'Sin clasificar',
      });
    }
  }

  return out;
}
