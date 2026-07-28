import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { PublicPropiedadListItem } from '@/types/public-search';
import {
  PUBLIC_PROPERTY_STATES,
  PUBLIC_PROPERTY_WHERE,
} from '@/lib/public-property-policy';

/**
 * Recomendaciones mixtas: mismo tipo/operación y/o propiedades a ≤700 m (radar).
 * Solo listados DISPONIBLE.
 */
export async function getPropiedadesSimilares(
  propiedadActualId: string,
  tipoPropiedad: string,
  tipoOperacion: string,
  latitud: number | null,
  longitud: number | null,
  limit = 8,
): Promise<PublicPropiedadListItem[]> {
  let idsCercanos: string[] = [];

  if (latitud != null && longitud != null && Number.isFinite(latitud) && Number.isFinite(longitud)) {
    const cercanos = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Propiedad"
      WHERE id != ${propiedadActualId}
      AND estado::text IN (${Prisma.join(PUBLIC_PROPERTY_STATES)})
      AND (
        6371000 * acos(
          cos(radians(${latitud})) * cos(radians(latitud)) *
          cos(radians(longitud) - radians(${longitud})) +
          sin(radians(${latitud})) * sin(radians(latitud))
        )
      ) <= 700
    `;
    idsCercanos = cercanos.map((c) => c.id);
  }

  const orConditions: Prisma.PropiedadWhereInput[] = [
    {
      AND: [
        { tipo: { equals: tipoPropiedad, mode: 'insensitive' } },
        { operacion: { equals: tipoOperacion, mode: 'insensitive' } },
      ],
    },
  ];

  if (idsCercanos.length > 0) {
    orConditions.push({ id: { in: idsCercanos } });
  }

  const rows = await prisma.propiedad.findMany({
    where: {
      ...PUBLIC_PROPERTY_WHERE,
      id: { not: propiedadActualId },
      OR: orConditions,
    },
    orderBy: [{ consultas: 'desc' }, { visitas: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: PUBLIC_LISTING_SELECT,
  });

  return mapRowsToPublicPropiedadList(rows);
}
