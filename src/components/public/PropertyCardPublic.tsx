'use client';

import Link from 'next/link';

import { FavoriteButton } from '@/components/public/FavoriteButton';
import { PropiedadExclusivaBadge } from '@/components/public/PropiedadExclusivaBadge';
import { PropertyImage } from '@/components/public/property-card/PropertyImage';
import { PropertyPrice } from '@/components/public/property-card/PropertyPrice';
import { isPropiedadDestacada } from '@/lib/propiedad-destacada';
import type { PublicPropiedadListItem } from '@/types/public-search';

type Props = {
  propiedad: PublicPropiedadListItem;
  isFavoritoInicial?: boolean;
  /** Fuerza estilo y badge de destacada (p. ej. en /destacados). */
  variant?: 'default' | 'featured';
};

export function PropertyCardPublic({
  propiedad,
  isFavoritoInicial = false,
  variant = 'default',
}: Props) {
  const destacada = variant === 'featured' || isPropiedadDestacada(propiedad);
  const featuredCard = variant === 'featured';
  const direccionLine = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');

  return (
    <article className="group relative">
      <div className="relative">
        <Link href={`/propiedades/${propiedad.id}`} className="block">
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-shadow group-hover:shadow-md ${
              featuredCard
                ? 'ring-2 ring-naranja/35 shadow-md shadow-naranja/10'
                : 'ring-1 ring-black/5'
            }`}
          >
            <PropertyImage
              source={propiedad.imagenes[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {propiedad.esExclusiva ? <PropiedadExclusivaBadge /> : null}
            {destacada && !propiedad.esExclusiva ? (
              <span
                className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-sm ${
                  featuredCard
                    ? 'bg-naranja text-white'
                    : 'bg-white/90 text-naranja'
                }`}
              >
                Destacada
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-1">
            <PropertyPrice
              amount={propiedad.precio}
              currency={propiedad.moneda}
              className="text-xl font-semibold tracking-tight text-naranja"
            />
            <p className="text-xs font-medium text-text-secondary">
              {propiedad.ambientes} amb. · {propiedad.banos} baños · {Math.round(propiedad.m2Total)} m²
              {propiedad.dormitorios > 0 ? ` · ${propiedad.dormitorios} dorm.` : null}
            </p>
            <p className="line-clamp-2 text-sm text-text-secondary">{direccionLine}</p>
          </div>
        </Link>
        <FavoriteButton
          propiedadId={propiedad.id}
          isFavoritoInicial={isFavoritoInicial}
          className="absolute right-3 top-3 z-20"
        />
      </div>
    </article>
  );
}
