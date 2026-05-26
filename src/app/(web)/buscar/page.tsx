import { EstadoPropiedad, type Prisma } from '@prisma/client';

import { getServerAuthSession } from '@/lib/auth';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import { prisma } from '@/lib/prisma';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { SessionUserAugmented } from '@/types/auth';

import { BuscarExplorer } from './BuscarExplorer';

export const metadata = {
  title: 'Buscar propiedades | Propea Group',
  description: 'Explorá propiedades en mapa y listado.',
};

function firstString(v: string | string[] | undefined): string {
  if (v === undefined) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

/** Valores del formulario (MAYÚSCULAS) para coincidir con DB y payload del panel. */
function operacionFromParam(raw: string): string | undefined {
  const x = raw.trim().toUpperCase();
  if (x === 'VENTA') return 'VENTA';
  if (x === 'ALQUILER') return 'ALQUILER';
  const lower = raw.trim().toLowerCase();
  if (lower === 'venta') return 'VENTA';
  if (lower === 'alquiler') return 'ALQUILER';
  return undefined;
}

/** Tipos en DB: Casa, Departamento, Lote, etc. Normalizamos desde URL. */
function tipoFromParam(raw: string): string | undefined {
  const x = raw.trim().toLowerCase();
  if (x === 'casa') return 'Casa';
  if (x === 'depto' || x === 'departamento') return 'Departamento';
  if (x === 'lote') return 'Lote';
  return undefined;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BuscarPage({ searchParams }: PageProps) {
  const sp = (await Promise.resolve(searchParams ?? {})) as Record<
    string,
    string | string[] | undefined
  >;
  const queryRaw = firstString(sp.query).trim();
  const operacionRaw = firstString(sp.operacion);
  const tipoRaw = firstString(sp.tipo);

  const operacionFilter = operacionFromParam(operacionRaw);
  const tipoFilter = tipoFromParam(tipoRaw);

  const clauses: Prisma.PropiedadWhereInput[] = [
    {
      estado: {
        in: [
          EstadoPropiedad.DISPONIBLE,
          EstadoPropiedad.RESERVADA,
          EstadoPropiedad.PAUSADA,
        ],
      },
    },
  ];

  if (operacionFilter) {
    clauses.push({
      operacion: { equals: operacionFilter, mode: 'insensitive' },
    });
  }

  if (tipoFilter) {
    clauses.push({
      tipo: { equals: tipoFilter, mode: 'insensitive' },
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
