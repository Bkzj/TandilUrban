'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

import type { PublicPropiedadListItem } from '@/types/public-search';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop';

type Props = {
  propiedad: PublicPropiedadListItem;
};

/** Hasta no existir `isDestacada` en Prisma: destacamos listings con buen engagement. */
function isDestacadaSimulada(p: PublicPropiedadListItem): boolean {
  return p.visitas >= 25 || p.consultas >= 8;
}

export function PropertyCardPublic({ propiedad }: Props) {
  const [fav, setFav] = useState(false);
  const img = propiedad.imagenes[0]?.trim() || PLACEHOLDER;
  const destacada = isDestacadaSimulada(propiedad);
  const direccionLine = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');
  const precioFmt = `${propiedad.moneda} ${propiedad.precio.toLocaleString('es-AR')}`;

  return (
    <article className="group relative">
      <div className="relative">
        <Link href={`/propiedades/${propiedad.id}`} className="block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {destacada ? (
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-naranja shadow-sm backdrop-blur-sm">
                Destacada
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-xl font-semibold tracking-tight text-text-primary">
              <span className="text-naranja">{precioFmt}</span>
            </p>
            <p className="text-xs font-medium text-text-secondary">
              {propiedad.ambientes} amb. · {propiedad.banos} baños · {Math.round(propiedad.m2Total)} m²
              {propiedad.dormitorios > 0 ? ` · ${propiedad.dormitorios} dorm.` : null}
            </p>
            <p className="line-clamp-2 text-sm text-text-secondary">{direccionLine}</p>
          </div>
        </Link>
        <button
          type="button"
          aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className="absolute right-3 top-3 z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md backdrop-blur-sm transition hover:bg-white"
          onClick={() => setFav((v) => !v)}
        >
          <Heart
            className={`h-5 w-5 ${fav ? 'fill-naranja text-naranja' : 'text-gray-600'}`}
            aria-hidden
          />
        </button>
      </div>
    </article>
  );
}
