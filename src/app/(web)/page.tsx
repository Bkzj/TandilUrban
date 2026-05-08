import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import HomeClient, { type HomePropiedadListItem } from '@/components/HomeClient';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function propiedadEsSustentable(caracteristicas: string[]): boolean {
  return caracteristicas.some((c) => {
    const s = c.toLowerCase();
    return (
      s.includes('solar') ||
      s.includes('sustent') ||
      s.includes('eco') ||
      s.includes('eficien')
    );
  });
}

type HomePageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const sp = await Promise.resolve(searchParams ?? {});
  const tipo = firstParam(sp.tipo);
  const operacion = firstParam(sp.operacion);
  const barrio = firstParam(sp.barrio);

  const where: Prisma.PropiedadWhereInput = {
    estado: 'DISPONIBLE',
  };

  if (tipo && tipo !== 'Todos') where.tipo = tipo;
  if (operacion && operacion !== 'Todos') where.operacion = operacion;

  if (barrio && barrio.trim() !== '') {
    where.barrio = {
      contains: barrio.trim(),
      mode: 'insensitive',
    };
  }

  const rows = await prisma.propiedad.findMany({
    where,
    orderBy: { precio: 'asc' },
    select: {
      id: true,
      titulo: true,
      precio: true,
      moneda: true,
      operacion: true,
      ambientes: true,
      m2Total: true,
      latitud: true,
      longitud: true,
      tipo: true,
      imagenes: true,
      caracteristicas: true,
    },
  });

  const propiedades: HomePropiedadListItem[] = rows.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    precio: p.precio,
    moneda: p.moneda,
    operacion: p.operacion,
    ambientes: p.ambientes,
    m2Total: p.m2Total,
    latitud: p.latitud,
    longitud: p.longitud,
    tipo: p.tipo,
    imagenes: p.imagenes,
    esSustentable: propiedadEsSustentable(p.caracteristicas),
  }));

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <HomeClient propiedades={propiedades} />
    </main>
  );
}
