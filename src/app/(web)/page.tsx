import { EstadoPropiedad, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HomeHeroBlock } from '@/components/HomeHeroBlock';
import { HomeListings, type HomePropiedadListItem } from '@/components/HomeListings';
import { OportunidadesIntro } from '@/components/public/OportunidadesIntro';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function propiedadEsSustentable(caracteristicas: unknown): boolean {
  if (!Array.isArray(caracteristicas)) return false;
  return caracteristicas.some((c) => {
    const s = String(c).toLowerCase();
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
    estado: EstadoPropiedad.DISPONIBLE,
  };

  if (tipo && tipo !== 'Todos') where.tipo = tipo;
  if (operacion && operacion !== 'Todos') where.operacion = operacion;

  if (barrio && barrio.trim() !== '') {
    where.barrio = {
      contains: barrio.trim(),
      mode: 'insensitive',
    };
  }

  const [rows, barriosRows] = await Promise.all([
    prisma.propiedad.findMany({
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
    }),
    prisma.propiedad.findMany({
      where: { estado: EstadoPropiedad.DISPONIBLE, barrio: { not: null } },
      select: { barrio: true },
      distinct: ['barrio'],
    }),
  ]);

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
    imagenes: imagenesItemsToUrls(normalizePropiedadImagenesDb(p.imagenes)),
    esSustentable: propiedadEsSustentable(p.caracteristicas),
  }));

  const barrios = barriosRows
    .map((r) => r.barrio)
    .filter((b): b is string => typeof b === 'string' && b.trim() !== '')
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <HomeHeroBlock barrios={barrios} />
      <OportunidadesIntro />
      <HomeListings propiedades={propiedades} />
    </main>
  );
}
