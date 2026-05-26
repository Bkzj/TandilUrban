'use client';

import React, { useMemo, useState } from 'react';

import { useClientMounted } from '@/hooks/use-client-mounted';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/** Pin Propea Group (misma piedra que en el panel). */
const tandilIcon = L.divIcon({
  className: 'custom-tandil-pin',
  html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 12 22 12 22Z" fill="#957327" stroke="#12422A" stroke-width="2"/>
    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="#F5F6F4"/>
    <path d="M10 10.5L11.5 9L13.5 11" stroke="#957327" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

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

  const pinFijo = useMemo(() => tandilIcon, []);

  const toggleFiltro = (id: string) => {
    setFiltrosActivos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  if (!isMounted)
    return (
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-background text-text-secondary">
        Cargando mapa...
      </div>
    );

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
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {marcadorFijo && (
          <Marker position={[marcadorFijo.lat, marcadorFijo.lng]} icon={pinFijo} zIndexOffset={1000}>
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
