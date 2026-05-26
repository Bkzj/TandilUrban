import { EstadoPropiedad, type Prisma } from '@prisma/client';

import { EMPRENDIMIENTOS_EDITORIALES } from '@/constants/emprendimientos';
import { prisma } from '@/lib/prisma';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { EmprendimientosPageData } from '@/types/emprendimientos';

const PUBLIC_WHERE: Prisma.PropiedadWhereInput = {
  estado: {
    in: [EstadoPropiedad.DISPONIBLE, EstadoPropiedad.RESERVADA],
  },
};

const POZO_KEYWORDS = ['pozo', 'emprendimiento', 'desarrollo', 'torre', 'barrio privado'];

function pozoKeywordClause(): Prisma.PropiedadWhereInput {
  return {
    OR: POZO_KEYWORDS.flatMap((kw) => [
      { titulo: { contains: kw, mode: 'insensitive' as const } },
      { descripcion: { contains: kw, mode: 'insensitive' as const } },
    ]),
  };
}

export async function getEmprendimientosPageData(): Promise<EmprendimientosPageData> {
  const [localesRows, pozoRows, pozoFallbackRows] = await Promise.all([
    prisma.propiedad.findMany({
      where: {
        AND: [
          PUBLIC_WHERE,
          {
            OR: [
              { tipo: { in: ['Local', 'Oficina'], mode: 'insensitive' } },
              { titulo: { contains: 'local', mode: 'insensitive' } },
              { titulo: { contains: 'comercial', mode: 'insensitive' } },
              { descripcion: { contains: 'comercial', mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: PUBLIC_LISTING_SELECT,
    }),
    prisma.propiedad.findMany({
      where: {
        AND: [PUBLIC_WHERE, pozoKeywordClause()],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: PUBLIC_LISTING_SELECT,
    }),
    prisma.propiedad.findMany({
      where: {
        AND: [
          PUBLIC_WHERE,
          { tipo: { in: ['Departamento', 'Casa'], mode: 'insensitive' } },
          { operacion: { equals: 'VENTA', mode: 'insensitive' } },
        ],
      },
      orderBy: { precio: 'desc' },
      take: 4,
      select: PUBLIC_LISTING_SELECT,
    }),
  ]);

  const proyectosPozo =
    pozoRows.length > 0
      ? mapRowsToPublicPropiedadList(pozoRows)
      : mapRowsToPublicPropiedadList(pozoFallbackRows);

  return {
    editoriales: EMPRENDIMIENTOS_EDITORIALES,
    proyectosPozo,
    localesComerciales: mapRowsToPublicPropiedadList(localesRows),
  };
}
