'use client';

import React, { useState } from 'react';

import { useClientMounted } from '@/hooks/use-client-mounted';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import { PropeaMapTileLayer } from '@/components/maps/LeafletInfrastructure';
import { LeafletMapLoading } from '@/components/maps/LeafletMapLoading';
import { getPropeaMapIcon } from '@/lib/propea-map-icon';

export interface FiltroMapa {
  id: string;
  nombre: string;
  icono: string;
}

export interface PuntoMapa {
  id: string;
  lat: number;
  lng: number;
  categoriaId: string;
  titulo: string;
  subtitulo?: string;
  icono: string;
}

interface MapProps {
  centro: [number, number];
  zoom?: number;
  marcadorFijo?: PuntoMapa;
  puntos: PuntoMapa[];
  filtros: FiltroMapa[];
  filtrosActivosIniciales?: string[];
}

const crearIcono = (emoji: string, esPrincipal: boolean = false) => {
  return L.divIcon({
    className: 'bg-transparent',
    html: `<div class="${esPrincipal ? 'text-5xl drop-shadow-2xl z-50 animate-bounce' : 'text-3xl drop-shadow-md hover:scale-110 transition-transform'}">${emoji}</div>`,
    iconSize: esPrincipal ? [50, 50] : [30, 30],
    iconAnchor: esPrincipal ? [25, 50] : [15, 30],
  });
};

export default function UniversalMap({
  centro,
  zoom = 13,
  marcadorFijo,
  puntos,
  filtros,
  filtrosActivosIniciales = [],
}: MapProps) {
  const isMounted = useClientMounted();
  const [filtrosActivos, setFiltrosActivos] = useState<string[]>(filtrosActivosIniciales);

  const toggleFiltro = (id: string) => {
    setFiltrosActivos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  if (!isMounted)
    return <LeafletMapLoading />;

  return (
    <div className="group relative h-full w-full font-sans">
      {filtros.length > 0 && (
        <div className="pointer-events-none absolute left-0 right-0 top-4 z-[400] flex justify-center">
          <div className="pointer-events-auto flex max-w-4xl flex-wrap justify-center gap-2 rounded-2xl border border-border-light bg-surface/90 p-3 shadow-xl backdrop-blur-md">
            {filtros.map((filtro) => {
              const activo = filtrosActivos.includes(filtro.id);
              return (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() => toggleFiltro(filtro.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    activo
                      ? 'scale-105 bg-verde text-surface shadow-md'
                      : 'bg-background text-text-secondary hover:bg-verde-light'
                  }`}
                >
                  <span>{filtro.icono}</span>
                  <span className="hidden sm:inline">{filtro.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MapContainer center={centro} zoom={zoom} scrollWheelZoom={false} className="z-0 h-full w-full">
        <PropeaMapTileLayer />

        {marcadorFijo && (
          <Marker position={[marcadorFijo.lat, marcadorFijo.lng]} icon={getPropeaMapIcon()} zIndexOffset={1000}>
            <Popup className="text-center font-sans">
              <strong className="block text-lg text-verde">{marcadorFijo.titulo}</strong>
              {marcadorFijo.subtitulo && (
                <span className="block text-xs uppercase text-text-secondary">{marcadorFijo.subtitulo}</span>
              )}
            </Popup>
          </Marker>
        )}

        {puntos
          .filter((punto) => filtrosActivos.includes(punto.categoriaId))
          .map((punto) => (
            <Marker key={punto.id} position={[punto.lat, punto.lng]} icon={crearIcono(punto.icono)}>
              <Popup>
                <div className="text-center font-sans">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-text-secondary">
                    {punto.categoriaId}
                  </span>
                  <strong className="block leading-tight text-text-primary">{punto.titulo}</strong>
                  {punto.subtitulo && (
                    <span className="mt-2 inline-block rounded-md bg-verde px-2 py-1 text-sm font-bold text-surface">
                      {punto.subtitulo}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
