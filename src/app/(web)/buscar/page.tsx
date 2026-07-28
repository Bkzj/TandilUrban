import type { Prisma } from '@prisma/client';

import { getServerAuthSession } from '@/lib/auth';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import { prisma } from '@/lib/prisma';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { SessionUserAugmented } from '@/types/auth';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import { searchPropertiesSchema } from '@/lib/validation/pagination';

import { BuscarExplorer } from './BuscarExplorer';

export const metadata = {
  title: 'Buscar propiedades | Propea Group',
  description: 'Explorá propiedades en mapa y listado.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BuscarPage({ searchParams }: PageProps) {
  const sp = await Promise.resolve(searchParams ?? {});
  const firstValues = Object.fromEntries(
    Object.entries(sp).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsedFilters = searchPropertiesSchema.safeParse(firstValues);
  const filters = parsedFilters.success ? parsedFilters.data : searchPropertiesSchema.parse({});
  const queryRaw = filters.query;
  const operacionRaw = typeof firstValues.operacion === 'string' ? firstValues.operacion : '';
  const tipoRaw = typeof firstValues.tipo === 'string' ? firstValues.tipo : '';

  const clauses: Prisma.PropiedadWhereInput[] = [
    PUBLIC_PROPERTY_WHERE,
  ];

  if (filters.operacion) {
    clauses.push({
      operacion: { equals: filters.operacion, mode: 'insensitive' },
    });
  }

  if (filters.tipo) {
    clauses.push({
      tipo: { equals: filters.tipo, mode: 'insensitive' },
    });
  }

  if (queryRaw) {
    clauses.push({
      OR: [
        { titulo: { contains: queryRaw, mode: 'insensitive' } },
        { direccion: { contains: queryRaw, mode: 'insensitive' } },
        { barrio: { contains: queryRaw, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.PropiedadWhereInput = { AND: clauses };

  const session = await getServerAuthSession();
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;
  const favoritoIds = userId ? await getFavoritePropiedadIds(userId) : new Set<string>();

  const rows = await prisma.propiedad.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 120,
    select: PUBLIC_LISTING_SELECT,
  });

  const propiedades = mapRowsToPublicPropiedadList(rows);

  return (
    <BuscarExplorer
      propiedades={propiedades}
      favoritoIds={favoritoIds}
      initialQuery={queryRaw}
      initialOperacionUrl={operacionRaw}
      initialTipoUrl={tipoRaw}
    />
  );
}
