'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. Definimos las interfaces estrictas para que el mapa sea universal
export interface FiltroMapa {
  id: string;
  nombre: string;
  icono: string;
}

export interface PuntoMapa {
  id: string;
  lat: number;
  lng: number;
  categoriaId: string; // Para conectarlo con el filtro
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

// Generador de iconos genérico
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
  filtrosActivosIniciales = [] 
}: MapProps) {
  
  const [isMounted, setIsMounted] = useState(false);
  
  // Estado que guarda un array con los IDs de los filtros prendidos
  const [filtrosActivos, setFiltrosActivos] = useState<string[]>(filtrosActivosIniciales);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Lógica para prender/apagar filtros individuales
  const toggleFiltro = (id: string) => {
    setFiltrosActivos(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  if (!isMounted) return <div className="flex h-full w-full animate-pulse items-center justify-center bg-background text-text-secondary">Cargando mapa...</div>;

  return (
    <div className="w-full h-full relative font-sans group">
      
      {/* BARRA DE FILTROS GENÉRICA */}
      {filtros.length > 0 && (
        <div className="absolute top-4 left-0 right-0 z-[400] flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex max-w-4xl flex-wrap justify-center gap-2 rounded-2xl border border-border-light bg-surface/90 p-3 shadow-xl backdrop-blur-md">
            {filtros.map(filtro => {
              const activo = filtrosActivos.includes(filtro.id);
              return (
                <button
                  key={filtro.id}
                  onClick={() => toggleFiltro(filtro.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    activo ? 'scale-105 bg-verde text-surface shadow-md' : 'bg-background text-text-secondary hover:bg-verde-light'
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

      {/* EL MAPA */}
      <MapContainer center={centro} zoom={zoom} scrollWheelZoom={false} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* 1. RENDERIZAR MARCADOR FIJO (Si el invocador lo mandó) */}
        {marcadorFijo && (
          <Marker position={[marcadorFijo.lat, marcadorFijo.lng]} icon={crearIcono(marcadorFijo.icono, true)} zIndexOffset={1000}>
            <Popup className="font-sans text-center">
              <strong className="block text-lg text-verde">{marcadorFijo.titulo}</strong>
              {marcadorFijo.subtitulo && <span className="block text-xs uppercase text-text-secondary">{marcadorFijo.subtitulo}</span>}
            </Popup>
          </Marker>
        )}

        {/* 2. RENDERIZAR PUNTOS FILTRADOS */}
        {puntos
          .filter(punto => filtrosActivos.includes(punto.categoriaId))
          .map(punto => (
            <Marker key={punto.id} position={[punto.lat, punto.lng]} icon={crearIcono(punto.icono)}>
              <Popup>
                <div className="text-center font-sans">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-text-secondary">{punto.categoriaId}</span>
                  <strong className="block leading-tight text-text-primary">{punto.titulo}</strong>
                  {punto.subtitulo && <span className="mt-2 inline-block rounded-md bg-verde px-2 py-1 text-sm font-bold text-surface">{punto.subtitulo}</span>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}