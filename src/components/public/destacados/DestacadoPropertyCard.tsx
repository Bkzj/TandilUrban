'use client';

import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';

import { FavoriteButton } from '@/components/public/FavoriteButton';
import { PropiedadExclusivaBadge } from '@/components/public/PropiedadExclusivaBadge';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop';

const HOVER_MS = 'duration-[1100ms]';
const EASE_OUT = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

type Props = {
  propiedad: PublicPropiedadListItem;
  isFavoritoInicial?: boolean;
  rank?: number;
  size?: 'sm' | 'md';
};

function formatPrecio(p: PublicPropiedadListItem): string {
  return `${p.moneda} ${p.precio.toLocaleString('es-AR')}`;
}

function PremiumVisual({
  propiedad,
  size,
}: {
  propiedad: PublicPropiedadListItem;
  size: 'sm' | 'md';
}) {
  const img = propiedad.imagenes[0]?.trim();
  const useFallback = !img;
  const src = img || PLACEHOLDER;

  return (
    <div
      className={`relative overflow-hidden bg-emerald-950 ${
        size === 'sm' ? 'aspect-[5/4]' : 'aspect-[4/3]'
      }`}
    >
      {useFallback ? (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-naranja-dark/85 to-emerald-900"
            aria-hidden
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <Star
              className={`fill-naranja-light/25 text-naranja-light/80 ${size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'}`}
              aria-hidden
            />
            <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
              Premium
            </p>
            <p className={`mt-1 font-medium text-white/90 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {propiedad.tipo}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-transform ${HOVER_MS} ${EASE_OUT} group-hover:scale-[1.03]`}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
            aria-hidden
          />
        </>
      )}
    </div>
  );
}

export function DestacadoPropertyCard({
  propiedad,
  isFavoritoInicial = false,
  rank,
  size = 'md',
}: Props) {
  const precioFmt = formatPrecio(propiedad);
  const direccionLine = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');
  const rankLabel = rank != null ? String(rank).padStart(2, '0') : null;
  const isSm = size === 'sm';

  return (
    <article
      className={`group mx-auto w-full transition-transform ${HOVER_MS} ${EASE_OUT} hover:-translate-y-0.5 ${
        isSm ? 'max-w-[280px]' : 'max-w-[340px]'
      }`}
    >
      {/* Marco exterior — aire y sensación de vitrina */}
      <div
        className={`rounded-[1.35rem] bg-gradient-to-b from-naranja-light/30 to-white/40 p-1.5 shadow-[0_2px_20px_-6px_rgba(149,115,39,0.12)] transition-shadow ${HOVER_MS} ${EASE_OUT} group-hover:shadow-[0_16px_40px_-12px_rgba(149,115,39,0.18)]`}
      >
        <div
          className={`relative overflow-hidden rounded-[1.1rem] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] transition-shadow ${HOVER_MS} ${EASE_OUT} group-hover:ring-naranja/15 group-hover:shadow-[0_12px_32px_-10px_rgba(28,94,60,0.12)]`}
        >
          <div className="absolute left-0 right-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-naranja/50 to-transparent" />

          <Link href={`/propiedades/${propiedad.id}`} className="block">
            <div className="relative">
              <PremiumVisual propiedad={propiedad} size={size} />

              {propiedad.esExclusiva ? <PropiedadExclusivaBadge /> : null}
              {rankLabel ? (
                <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5">
                  <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[0.55rem] font-bold tabular-nums tracking-wider text-naranja-light backdrop-blur-sm">
                    {rankLabel}
                  </span>
                </div>
              ) : null}
            </div>

            <div className={`space-y-2 ${isSm ? 'px-3.5 py-3.5' : 'px-4 py-4'}`}>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-emerald-950/90 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-emerald-50">
                  {propiedad.tipo}
                </span>
                <span className="rounded-full bg-naranja-light/80 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-naranja-dark">
                  {propiedad.operacion}
                </span>
              </div>

              {propiedad.titulo && !isSm ? (
                <p className="line-clamp-1 text-sm font-semibold leading-snug text-text-primary">
                  {propiedad.titulo}
                </p>
              ) : null}

              <p className={`font-bold tracking-tight text-naranja ${isSm ? 'text-base' : 'text-lg'}`}>
                {precioFmt}
              </p>

              <p className={`leading-snug text-text-secondary ${isSm ? 'text-[0.7rem]' : 'text-xs'}`}>
                {propiedad.ambientes} amb. · {Math.round(propiedad.m2Total)} m²
                {!isSm && propiedad.dormitorios > 0 ? ` · ${propiedad.dormitorios} dorm.` : null}
              </p>

              {!isSm ? (
                <p className="line-clamp-1 text-xs text-text-secondary/80">{direccionLine}</p>
              ) : null}

              <div className="flex items-center justify-between border-t border-black/[0.04] pt-2.5">
                <span className="text-[0.65rem] text-text-secondary/70">
                  {propiedad.visitas > 0 ? `${propiedad.visitas} visitas` : 'Selección curada'}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold text-naranja transition-all ${HOVER_MS} ${EASE_OUT} group-hover:gap-1.5 ${isSm ? 'text-[0.65rem]' : 'text-xs'}`}
                >
                  Ver ficha
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </span>
              </div>
            </div>
          </Link>

          <FavoriteButton
            propiedadId={propiedad.id}
            isFavoritoInicial={isFavoritoInicial}
            className="absolute right-2 top-2 z-20 scale-90"
          />
        </div>
      </div>
    </article>
  );
}
