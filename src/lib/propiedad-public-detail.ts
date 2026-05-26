import { prisma } from '@/lib/prisma';

/** Detalle público de ficha — tipado explícito para evitar desfase del language server con Prisma. */
export type PropiedadPublicDetail = {
  id: string;
  titulo: string;
  descripcion: string;
  operacion: string;
  tipo: string;
  precio: number;
  moneda: string;
  direccion: string;
  barrio: string | null;
  latitud: number;
  longitud: number;
  m2Total: number;
  ambientes: number;
  dormitorios: number;
  banos: number;
  cocheras: number;
  caracteristicas: string[];
  imagenes: unknown;
  agenteId: string | null;
  inmobiliaria: {
    nombreAgencia: string;
    userId: string;
    logoUrl: string | null;
    logoAgencia: string | null;
  };
};

export async function getPropiedadPublicDetail(
  id: string,
): Promise<PropiedadPublicDetail | null> {
  const row = await prisma.propiedad.findUnique({
    where: { id },
    include: {
      inmobiliaria: {
        select: {
          nombreAgencia: true,
          userId: true,
          logoAgencia: true,
        },
      },
    },
  });

  if (!row) return null;

  const inmo = row.inmobiliaria;
  const logoAgencia = inmo.logoAgencia;
  const logoUrl =
    (inmo as { logoUrl?: string | null }).logoUrl ?? logoAgencia ?? null;

  return {
    ...row,
    inmobiliaria: {
      nombreAgencia: inmo.nombreAgencia,
      userId: inmo.userId,
      logoAgencia,
      logoUrl,
    },
  } as unknown as PropiedadPublicDetail;
}
