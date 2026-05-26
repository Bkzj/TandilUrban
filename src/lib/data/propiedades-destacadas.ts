import { EstadoPropiedad, type Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  DESTACADA_MIN_CONSULTAS,
  DESTACADA_MIN_VISITAS,
} from '@/lib/propiedad-destacada';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PUBLIC_WHERE: Prisma.PropiedadWhereInput = {
  estado: {
    in: [EstadoPropiedad.DISPONIBLE, EstadoPropiedad.RESERVADA],
  },
};

export async function getPropiedadesDestacadas(): Promise<PublicPropiedadListItem[]> {
  const rows = await prisma.propiedad.findMany({
    where: {
      AND: [
        PUBLIC_WHERE,
        {
          OR: [
            { visitas: { gte: DESTACADA_MIN_VISITAS } },
            { consultas: { gte: DESTACADA_MIN_CONSULTAS } },
          ],
        },
      ],
    },
    orderBy: [{ visitas: 'desc' }, { consultas: 'desc' }],
    take: 48,
    select: PUBLIC_LISTING_SELECT,
  });

  if (rows.length > 0) {
    return mapRowsToPublicPropiedadList(rows);
  }

  const fallback = await prisma.propiedad.findMany({
    where: PUBLIC_WHERE,
    orderBy: [{ visitas: 'desc' }, { consultas: 'desc' }],
    take: 12,
    select: PUBLIC_LISTING_SELECT,
  });

  return mapRowsToPublicPropiedadList(fallback);
}
