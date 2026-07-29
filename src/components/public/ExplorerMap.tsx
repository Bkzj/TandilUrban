'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import { flyMapToPositions, runWhenMapReady } from '@/lib/map-coords-leaflet';
import {
  isValidMapLatLng,
  sanitizeLatLngPairs,
  TANDIL_CENTER,
  toValidLatLngPairs,
} from '@/lib/map-coords';

export type ExplorerMapPoint = {
  id: string;
  lat: number;
  lng: number;
  titulo?: string;
};

const pinIcon = L.divIcon({
  className: 'explorer-map-pin',
  html: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 12 22 12 22Z" fill="#957327" stroke="#12422A" stroke-width="2"/>
    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="#F5F6F4"/>
  </svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function normalizePoints(points: ExplorerMapPoint[]): ExplorerMapPoint[] {
  const out: ExplorerMapPoint[] = [];
  for (const p of points) {
    const pair = toValidLatLngPairs([{ lat: p.lat, lng: p.lng }]);
    if (pair.length === 1) {
      out.push({ ...p, lat: pair[0][0], lng: pair[0][1] });
    }
  }
  return out;
}

function FlyToVisibleBounds({ points }: { points: ExplorerMapPoint[] }) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointsKey = useMemo(
    () =>
      points
        .map((p) => `${p.id}:${p.lat}:${p.lng}`)
        .join('|'),
    [points],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const positions = sanitizeLatLngPairs(toValidLatLngPairs(points));
      runWhenMapReady(map, () => {
        requestAnimationFrame(() => flyMapToPositions(map, positions));
      });
    }, 420);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, pointsKey, points]);

  return null;
}

type ExplorerMapProps = {
  /** Propiedades visibles en la lista (scroll); el mapa encuadra solo estos pines. */
  visibleProperties: ExplorerMapPoint[];
};

export function ExplorerMap({ visibleProperties }: ExplorerMapProps) {
  const validProperties = useMemo(
    () => normalizePoints(visibleProperties),
    [visibleProperties],
  );

  const center = useMemo((): [number, number] => {
    const first = validProperties[0];
    if (!first || !isValidMapLatLng(first.lat, first.lng)) return TANDIL_CENTER;
    return [first.lat, first.lng];
  }, [validProperties]);

  const icon = useMemo(() => pinIcon, []);

  return (
    <div className="absolute inset-0 z-0 bg-gray-100">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FlyToVisibleBounds points={validProperties} />
        {validProperties.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon} title={p.titulo} />
        ))}
      </MapContainer>
    </div>
  );
}
