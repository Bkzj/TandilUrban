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

  if (!isMounted) return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Cargando mapa...</div>;

  return (
    <div className="w-full h-full relative font-sans group">
      
      {/* BARRA DE FILTROS GENÉRICA */}
      {filtros.length > 0 && (
        <div className="absolute top-4 left-0 right-0 z-[400] flex justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-200 flex flex-wrap gap-2 justify-center max-w-4xl pointer-events-auto">
            {filtros.map(filtro => {
              const activo = filtrosActivos.includes(filtro.id);
              return (
                <button
                  key={filtro.id}
                  onClick={() => toggleFiltro(filtro.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    activo ? 'bg-verde text-white shadow-md scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
              <strong className="text-verde block text-lg">{marcadorFijo.titulo}</strong>
              {marcadorFijo.subtitulo && <span className="text-gray-500 text-xs uppercase block">{marcadorFijo.subtitulo}</span>}
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
                  <span className="block text-gray-400 text-[10px] uppercase tracking-widest mb-1">{punto.categoriaId}</span>
                  <strong className="text-gray-800 leading-tight block">{punto.titulo}</strong>
                  {punto.subtitulo && <span className="bg-verde text-white px-2 py-1 rounded-md font-bold text-sm mt-2 inline-block">{punto.subtitulo}</span>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}