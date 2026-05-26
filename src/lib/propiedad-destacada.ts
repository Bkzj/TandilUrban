import type { PublicPropiedadListItem } from '@/types/public-search';

/** Hasta no existir `isDestacada` en Prisma: destacamos listings con buen engagement. */
export const DESTACADA_MIN_VISITAS = 25;
export const DESTACADA_MIN_CONSULTAS = 8;

export function isPropiedadDestacada(
  p: Pick<PublicPropiedadListItem, 'visitas' | 'consultas'>,
): boolean {
  return p.visitas >= DESTACADA_MIN_VISITAS || p.consultas >= DESTACADA_MIN_CONSULTAS;
}
