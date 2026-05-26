'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeroSearch from '@/components/public/HeroSearch';
import { PropertyCardPublic } from '@/components/public/PropertyCardPublic';

import { isValidMapLatLng } from '@/lib/map-coords';
import type { PublicPropiedadListItem } from '@/types/public-search';

const ExplorerMap = dynamic(
  () => import('@/components/public/ExplorerMap').then((m) => m.ExplorerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-gray-100 text-sm text-text-secondary">
        Cargando mapa…
      </div>
    ),
  }
);

type BuscarExplorerProps = {
  propiedades: PublicPropiedadListItem[];
  favoritoIds?: ReadonlySet<string>;
  initialQuery: string;
  initialOperacionUrl: string;
  initialTipoUrl: string;
};

function toMapPoints(list: PublicPropiedadListItem[]) {
  return list
    .filter((p) => isValidMapLatLng(p.latitud, p.longitud))
    .map((p) => ({
      id: p.id,
      lat: Number(p.latitud),
      lng: Number(p.longitud),
      titulo: p.titulo,
    }))
    .filter((p) => isValidMapLatLng(p.lat, p.lng));
}

export function BuscarExplorer({
  propiedades,
  favoritoIds,
  initialQuery,
  initialOperacionUrl,
  initialTipoUrl,
}: BuscarExplorerProps) {
  const propiedadIds = useMemo(() => propiedades.map((p) => p.id), [propiedades]);
  const propiedadIdsKey = propiedadIds.join('\0');

  const [visiblePropertyIds, setVisiblePropertyIds] = useState(propiedadIds);
  const [debouncedVisibleIds, setDebouncedVisibleIds] = useState(propiedadIds);
  const [syncedPropiedadIdsKey, setSyncedPropiedadIdsKey] = useState(propiedadIdsKey);

  if (syncedPropiedadIdsKey !== propiedadIdsKey) {
    setSyncedPropiedadIdsKey(propiedadIdsKey);
    setVisiblePropertyIds(propiedadIds);
    setDebouncedVisibleIds(propiedadIds);
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedVisibleIds(visiblePropertyIds);
    }, 380);
    return () => window.clearTimeout(t);
  }, [visiblePropertyIds]);

  useLayoutEffect(() => {
    if (propiedades.length === 0) return;

    const intersecting = new Set<string>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.getAttribute('data-buscar-card-id');
          if (!id) continue;
          if (e.isIntersecting) intersecting.add(id);
          else intersecting.delete(id);
        }
        const next = [...intersecting];
        setVisiblePropertyIds(next.length > 0 ? next : propiedades.map((p) => p.id));
      },
      { root: null, threshold: 0.32, rootMargin: '0px' }
    );

    const nodes = document.querySelectorAll<HTMLElement>('[data-buscar-card-id]');
    nodes.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [propiedades]);

  const mapVisiblePoints = useMemo(() => {
    const allow = new Set(debouncedVisibleIds);
    const filtered = propiedades.filter((p) => allow.has(p.id));
    return toMapPoints(filtered.length > 0 ? filtered : propiedades);
  }, [propiedades, debouncedVisibleIds]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <Navbar />
      <HeroSearch
        compact
        defaultQuery={initialQuery}
        defaultOperacion={initialOperacionUrl}
        defaultTipo={initialTipoUrl}
      />

      <div className="flex w-full items-start">
        <div className="w-full min-w-0 p-4 sm:p-6 lg:w-1/2 xl:w-[60%]">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              {propiedades.length}{' '}
              {propiedades.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Ajustá filtros en la barra superior o explorá en el mapa.
            </p>
          </header>

          {propiedades.length === 0 ? (
            <p className="rounded-2xl border border-border-light bg-white p-8 text-center text-text-secondary">
              No hay resultados para esta búsqueda. Probá otras palabras o filtros.
            </p>
          ) : (
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
              {propiedades.map((p) => (
                <div key={p.id} data-buscar-card-id={p.id} className="scroll-mt-6 w-full min-w-0">
                  <PropertyCardPublic
                    propiedad={p}
                    isFavoritoInicial={favoritoIds?.has(p.id) ?? false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative hidden lg:block lg:w-1/2 xl:w-[40%] sticky top-0 h-screen">
          <ExplorerMap visibleProperties={mapVisiblePoints} />
        </div>
      </div>
    </div>
  );
}
