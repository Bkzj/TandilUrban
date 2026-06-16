'use client';

import Link from 'next/link';

import { FavoriteButton } from '@/components/public/FavoriteButton';
import { PropiedadExclusivaBadge } from '@/components/public/PropiedadExclusivaBadge';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop';

type Props = {
  propiedad: PublicPropiedadListItem;
  isFavoritoInicial?: boolean;
  badge: string;
  badgeTone?: 'verde' | 'naranja';
};

export function EmprendimientoPropiedadCard({
  propiedad,
  isFavoritoInicial = false,
  badge,
  badgeTone = 'verde',
}: Props) {
  const img = propiedad.imagenes[0]?.trim() || PLACEHOLDER;
  const direccionLine = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');
  const precioFmt = `${propiedad.moneda} ${propiedad.precio.toLocaleString('es-AR')}`;
  const badgeClass =
    badgeTone === 'naranja' ? 'bg-naranja text-white' : 'bg-verde text-white';

  return (
    <article className="group relative">
      <div className="relative">
        <Link href={`/propiedades/${propiedad.id}`} className="block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-2 ring-verde/15 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-verde/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {propiedad.esExclusiva ? <PropiedadExclusivaBadge /> : null}
            <span
              className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide shadow-sm ${badgeClass}`}
            >
              {badge}
            </span>
            <span className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/55 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
              Ficha Propea
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <p className="line-clamp-1 text-base font-semibold text-text-primary">{propiedad.titulo}</p>
            <p className="text-xl font-semibold tracking-tight text-verde">{precioFmt}</p>
            <p className="text-xs font-medium text-text-secondary">
              {propiedad.tipo} · {propiedad.operacion} · {Math.round(propiedad.m2Total)} m²
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
