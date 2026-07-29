'use client';

import dynamic from 'next/dynamic';

import { LeafletMapLoading } from '@/components/maps/LeafletMapLoading';
import type { PoisCercanosResult } from '@/types/cercanias';

const PropiedadUbicacionMapInner = dynamic(() => import('./PropiedadUbicacionMapInner'), {
  ssr: false,
  loading: LeafletMapLoading,
});

type Props = {
  titulo: string;
  latitud: number;
  longitud: number;
  pois?: PoisCercanosResult | null;
  activeCategorias?: string[];
};

export function PropiedadUbicacionMap({
  titulo,
  latitud,
  longitud,
  pois,
  activeCategorias,
}: Props) {
  return (
    <div className="h-[280px] w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 sm:h-[360px] sm:rounded-2xl md:h-[400px]">
      <PropiedadUbicacionMapInner
        titulo={titulo}
        latitud={latitud}
        longitud={longitud}
        pois={pois}
        activeCategorias={activeCategorias}
      />
    </div>
  );
}
