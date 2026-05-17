'use client';

import dynamic from 'next/dynamic';

import type { PoisCercanosResult } from '@/types/cercanias';

function MapLoading() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-background text-text-secondary">
      Cargando mapa...
    </div>
  );
}

const PropiedadUbicacionMapInner = dynamic(() => import('./PropiedadUbicacionMapInner'), {
  ssr: false,
  loading: MapLoading,
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
