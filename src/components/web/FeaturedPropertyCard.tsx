'use client';

import Link from 'next/link';
import Image from 'next/image';

import { FavoriteButton } from '@/components/public/FavoriteButton';
import { PropiedadExclusivaBadge } from '@/components/public/PropiedadExclusivaBadge';
import { resolvePropertyImageSource } from '@/components/public/property-card/PropertyImage';
import { PropertyPrice } from '@/components/public/property-card/PropertyPrice';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop';

type Props = {
  propiedad: PublicPropiedadListItem;
  isFavoritoInicial?: boolean;
};

export function FeaturedPropertyCard({ propiedad, isFavoritoInicial = false }: Props) {
  const img = resolvePropertyImageSource(propiedad.imagenes[0], PLACEHOLDER);
  const useNativeImg = img.startsWith('data:');
  const visitasLabel = propiedad.destacada ? 'Propiedad destacada' : 'Selección curada';

  return (
    <article className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl bg-white shadow-lg transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl">
      <Link href={`/propiedades/${propiedad.id}`} className="flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {useNativeImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <Image
              src={img}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}

          {propiedad.esExclusiva ? <PropiedadExclusivaBadge /> : null}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#0A2A1A] px-3 py-1 text-xs font-bold uppercase text-white">
              {propiedad.tipo}
            </span>
            <span className="rounded-full bg-naranja-light px-3 py-1 text-xs font-bold uppercase text-naranja-dark">
              {propiedad.operacion}
            </span>
          </div>

          <PropertyPrice
            amount={propiedad.precio}
            currency={propiedad.moneda}
            className="text-2xl font-extrabold tracking-tight text-naranja sm:text-3xl"
          />

          <p className="text-sm text-gray-500">
            {propiedad.ambientes} amb. · {Math.round(propiedad.m2Total)} m² · {visitasLabel}
          </p>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-6 pb-6 pt-4">
        <FavoriteButton
          propiedadId={propiedad.id}
          isFavoritoInicial={isFavoritoInicial}
          className="relative scale-100"
        />
        <Link
          href={`/propiedades/${propiedad.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-naranja transition-transform duration-300 group-hover:translate-x-1"
        >
          Ver ficha ↗
        </Link>
      </div>
    </article>
  );
}
