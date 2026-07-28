import 'server-only';

import type { Prisma } from '@prisma/client';

import { isValidMapLatLng } from '@/lib/map-coords';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import {
  DESTACADA_MIN_CONSULTAS,
  DESTACADA_MIN_VISITAS,
} from '@/lib/propiedad-destacada';
import type { PublicPropiedadListItem } from '@/types/public-search';

export const PUBLIC_LISTING_SELECT = {
  id: true,
  titulo: true,
  direccion: true,
  barrio: true,
  precio: true,
  moneda: true,
  operacion: true,
  tipo: true,
  ambientes: true,
  dormitorios: true,
  banos: true,
  m2Total: true,
  latitud: true,
  longitud: true,
  imagenes: true,
  visitas: true,
  consultas: true,
  esExclusiva: true,
} satisfies Prisma.PropiedadSelect;

export type PublicListingRow = Prisma.PropiedadGetPayload<{
  select: typeof PUBLIC_LISTING_SELECT;
}>;

function coerceCoord(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value != null && typeof value === 'object' && 'toNumber' in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number(value);
}

export function mapRowsToPublicPropiedadList(
  rows: PublicListingRow[],
): PublicPropiedadListItem[] {
  return rows.map((p) => {
    const latitud = coerceCoord(p.latitud);
    const longitud = coerceCoord(p.longitud);
    return {
      id: p.id,
      titulo: p.titulo,
      direccion: p.direccion,
      barrio: p.barrio,
      precio: p.precio,
      moneda: p.moneda,
      operacion: p.operacion,
      tipo: p.tipo,
      ambientes: p.ambientes,
      dormitorios: p.dormitorios,
      banos: p.banos,
      m2Total: p.m2Total,
      latitud: isValidMapLatLng(latitud, longitud) ? latitud : 0,
      longitud: isValidMapLatLng(latitud, longitud) ? longitud : 0,
      imagenes: imagenesItemsToUrls(normalizePropiedadImagenesDb(p.imagenes)),
      destacada:
        p.visitas >= DESTACADA_MIN_VISITAS ||
        p.consultas >= DESTACADA_MIN_CONSULTAS,
      esExclusiva: p.esExclusiva,
    };
  });
}
