/** Hasta no existir `isDestacada` en Prisma: destacamos listings con buen engagement. */
export const DESTACADA_MIN_VISITAS = 25;
export const DESTACADA_MIN_CONSULTAS = 8;

export function isPropiedadDestacada(
  p: { destacada: boolean },
): boolean {
  return p.destacada;
}
