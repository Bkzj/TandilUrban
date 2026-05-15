'use client';

import dynamic from 'next/dynamic';

export type { FiltroMapa, PuntoMapa } from './MapInner';

function MapLoading() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-background text-text-secondary">
      Cargando mapa...
    </div>
  );
}

export default dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: MapLoading,
});
