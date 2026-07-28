import Link from 'next/link';
import { HeartCrack } from 'lucide-react';

import { PropertyGrid } from '@/components/public/PropertyGrid';
import { getCurrentUser } from '@/lib/auth';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';

export const metadata = {
  title: 'Mis favoritos | Propea Group',
};

export default async function PerfilFavoritosPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  const favoritoIds = await getFavoritePropiedadIds(userId);

  const rows = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      favoritos: {
        where: PUBLIC_PROPERTY_WHERE,
        orderBy: { updatedAt: 'desc' },
        select: PUBLIC_LISTING_SELECT,
      },
    },
  });

  const propiedades = mapRowsToPublicPropiedadList(rows?.favoritos ?? []);

  if (propiedades.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm sm:py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <HeartCrack className="h-10 w-10 text-gray-400" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-bold text-gray-900">Aún no guardaste ninguna propiedad</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
          Explorá el catálogo y tocá el corazón en las fichas que te interesen para verlas acá.
        </p>
        <Link
          href="/buscar"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-verde px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-verde/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde focus-visible:ring-offset-2"
        >
          Explorar Propiedades
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Mis favoritos</h2>
        <p className="mt-1 text-sm text-gray-500">
          {propiedades.length}{' '}
          {propiedades.length === 1 ? 'propiedad guardada' : 'propiedades guardadas'}
        </p>
      </div>
      <PropertyGrid propiedades={propiedades} favoritoIds={favoritoIds} />
    </section>
  );
}
