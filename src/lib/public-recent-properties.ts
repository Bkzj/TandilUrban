import 'server-only';

import type { Prisma } from '@prisma/client';

import { decimalToMoneyText } from '@/lib/money';
import { formatMoney } from '@/lib/money-format';
import { prisma } from '@/lib/prisma';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import type { RecentPropertyDto } from '@/types/public-property';

const RECENT_PROPERTY_SELECT = {
  id: true,
  titulo: true,
  precio: true,
  moneda: true,
  operacion: true,
  imagenes: true,
} satisfies Prisma.PropiedadSelect;

export const MAX_RECENT_PROPERTIES = 6;

export async function getPublicRecentProperties(
  ids: readonly string[],
): Promise<RecentPropertyDto[]> {
  const uniqueIds = [...new Set(ids)].slice(0, MAX_RECENT_PROPERTIES);
  if (uniqueIds.length === 0) return [];

  const rows = await prisma.propiedad.findMany({
    where: {
      ...PUBLIC_PROPERTY_WHERE,
      id: { in: uniqueIds },
    },
    select: RECENT_PROPERTY_SELECT,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return uniqueIds.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const imagenes = imagenesItemsToUrls(normalizePropiedadImagenesDb(row.imagenes));
    return [{
      id: row.id,
      titulo: row.titulo,
      precio: formatMoney(decimalToMoneyText(row.precio), row.moneda),
      tipoOperacion: row.operacion.toUpperCase(),
      imagen: imagenes[0] ?? '',
    }];
  });
}
