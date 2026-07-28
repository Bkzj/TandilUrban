import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import type { PublicPropertyOgDto } from '@/types/public-property';

const OG_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop';

/** Satori (next/og) no soporta AVIF; Cloudinary suele entregar AVIF por defecto. */
const CLOUDINARY_OG_TRANSFORMS = 'f_jpg,q_auto:good,w_1200,h_630,c_fill';

/**
 * URL compatible con ImageResponse: fuerza JPG en Cloudinary y evita AVIF/WebP problemáticos.
 */
export function toOgSafeImageUrl(url: string): string {
  const trimmed = url?.trim();
  if (!trimmed) return OG_PLACEHOLDER_IMAGE;

  try {
    const u = new URL(trimmed);
    if (u.hostname === 'res.cloudinary.com') {
      const marker = '/image/upload/';
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const before = u.pathname.slice(0, idx + marker.length);
        let after = u.pathname.slice(idx + marker.length);
        const segments = after.split('/').filter(Boolean);

        if (segments.length > 0 && (segments[0].includes(',') || /^f_/.test(segments[0]))) {
          if (!segments[0].includes('f_jpg')) {
            segments[0] = `f_jpg,${segments[0]}`;
          }
          after = segments.join('/');
        } else {
          after = `${CLOUDINARY_OG_TRANSFORMS}/${after}`;
        }

        u.pathname = `${before}${after}`;
        return u.toString();
      }
    }
  } catch {
    /* usar fallback abajo */
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('.avif') || lower.endsWith('.webp')) {
    return OG_PLACEHOLDER_IMAGE;
  }

  return trimmed;
}

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export const PUBLIC_PROPERTY_OG_SELECT = {
      id: true,
      titulo: true,
      descripcion: true,
      operacion: true,
      precio: true,
      moneda: true,
      dormitorios: true,
      banos: true,
      imagenes: true,
} satisfies Prisma.PropiedadSelect;

export async function getPropiedadOgData(id: string): Promise<PublicPropertyOgDto | null> {
  const propiedad = await prisma.propiedad.findFirst({
    where: { id, ...PUBLIC_PROPERTY_WHERE },
    select: PUBLIC_PROPERTY_OG_SELECT,
  });

  if (!propiedad) return null;

  const imagenes = normalizePropiedadImagenesDb(propiedad.imagenes);
  const imagenUrl = toOgSafeImageUrl(imagenes[0]?.url ?? OG_PLACEHOLDER_IMAGE);

  const precioFmt =
    propiedad.precio != null
      ? `${propiedad.moneda} ${propiedad.precio.toLocaleString('es-AR')}`
      : 'Valor a consultar';

  const operacionLabel = String(propiedad.operacion).toUpperCase();

  const descripcion = propiedad.descripcion ?? '';
  const descripcionResumen =
    descripcion.length > 150 ? `${descripcion.slice(0, 150)}...` : descripcion;

  const imagenesOg = imagenes.map((img) => ({
    url: toOgSafeImageUrl(img.url),
  }));

  return {
    id: propiedad.id,
    titulo: propiedad.titulo,
    descripcion,
    descripcionResumen,
    operacionLabel,
    precioFmt,
    dormitorios: propiedad.dormitorios,
    banos: propiedad.banos,
    imagenUrl,
    imagenes: imagenesOg,
  };
}

export function buildPropiedadOgImageUrl(propiedadId: string, baseUrl?: string): string {
  const base = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, '');
  return `${base}/api/og/propiedad?id=${encodeURIComponent(propiedadId)}`;
}
