import { prisma } from '@/lib/prisma';
import { HomeHeroBlock } from '@/components/HomeHeroBlock';
import { HomeAgenciesPreview } from '@/components/web/HomeAgenciesPreview';
import { HomeEmprendimientosPreview } from '@/components/web/HomeEmprendimientosPreview';
import { HomeMapSection } from '@/components/web/HomeMapSection';
import { HomeStandardPropertiesSection } from '@/components/web/HomeStandardPropertiesSection';
import { FeaturedPropertiesSection } from '@/components/web/FeaturedPropertiesSection';
import { getServerAuthSession } from '@/lib/auth';
import { getInmobiliariasDirectory } from '@/lib/data/inmobiliarias-directory';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { SessionUserAugmented } from '@/types/auth';
import type { PublicPropiedadListItem } from '@/types/public-search';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';

export default async function Home() {
  const session = await getServerAuthSession();
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;

  const [exclusivasRows, estandarRows, barriosRows, favoritoIdSet, inmobiliariasData] =
    await Promise.all([
      prisma.propiedad.findMany({
        where: { ...PUBLIC_PROPERTY_WHERE, esExclusiva: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: PUBLIC_LISTING_SELECT,
      }),
      prisma.propiedad.findMany({
        where: { ...PUBLIC_PROPERTY_WHERE, esExclusiva: false },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: PUBLIC_LISTING_SELECT,
      }),
      prisma.propiedad.findMany({
        where: { ...PUBLIC_PROPERTY_WHERE, barrio: { not: null } },
        select: { barrio: true },
        distinct: ['barrio'],
      }),
      userId ? getFavoritePropiedadIds(userId) : Promise.resolve(new Set<string>()),
      getInmobiliariasDirectory(),
    ]);

  const propiedadesExclusivas = mapRowsToPublicPropiedadList(exclusivasRows);
  const propiedadesEstandar = mapRowsToPublicPropiedadList(estandarRows);
  const favoritoIds = [...favoritoIdSet];

  const barrios = barriosRows
    .map((r) => r.barrio)
    .filter((b): b is string => typeof b === 'string' && b.trim() !== '')
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const propiedadesMapa: PublicPropiedadListItem[] = [
    ...propiedadesExclusivas,
    ...propiedadesEstandar,
  ];

  const inmobiliariasPreview = [...inmobiliariasData.destacadas, ...inmobiliariasData.todas].slice(
    0,
    4,
  );

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <HomeHeroBlock barrios={barrios} />

      <FeaturedPropertiesSection
        propiedades={propiedadesExclusivas}
        favoritoIds={favoritoIds}
        eyebrow="Selección exclusiva"
        title="Oportunidades únicas"
        titleAccent
        sectionClassName="border-b border-orange-100/50 bg-gradient-to-b from-orange-50/50 to-white py-16 sm:py-20"
        className="pb-8 sm:pb-10"
      />

      <HomeStandardPropertiesSection
        propiedades={propiedadesEstandar}
        favoritoIds={favoritoIds}
      />

      <HomeMapSection propiedades={propiedadesMapa} />
      <HomeEmprendimientosPreview />
      <HomeAgenciesPreview inmobiliarias={inmobiliariasPreview} />
    </main>
  );
}
