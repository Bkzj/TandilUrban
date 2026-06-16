'use client';

import { PropertyCardPublic } from '@/components/public/PropertyCardPublic';
import type { PublicPropiedadListItem } from '@/types/public-search';

type Props = {
  propiedades: PublicPropiedadListItem[];
  favoritoIds: string[];
};

export function HomeStandardPropertiesSection({ propiedades, favoritoIds }: Props) {
  const favoritoSet = new Set(favoritoIds);

  if (propiedades.length === 0) return null;

  return (
    <section className="bg-gray-50 pb-16 pt-8 sm:pb-20 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 text-center sm:mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Últimos ingresos
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Propiedades recién publicadas en el portal, listas para explorar.
          </p>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((propiedad) => (
            <PropertyCardPublic
              key={propiedad.id}
              propiedad={propiedad}
              isFavoritoInicial={favoritoSet.has(propiedad.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
