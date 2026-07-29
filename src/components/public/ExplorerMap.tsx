'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, useMap } from 'react-leaflet';

import { PropeaMapTileLayer } from '@/components/maps/LeafletInfrastructure';
import { flyMapToPositions, runWhenMapReady } from '@/lib/map-coords-leaflet';
import {
  isValidMapLatLng,
  sanitizeLatLngPairs,
  TANDIL_CENTER,
  toValidLatLngPairs,
} from '@/lib/map-coords';
import { getPropeaMapIcon } from '@/lib/propea-map-icon';

export type ExplorerMapPoint = {
  id: string;
  lat: number;
  lng: number;
  titulo?: string;
};

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

  return (
    <div className="absolute inset-0 z-0 bg-gray-100">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: '100%' }}
      >
        <PropeaMapTileLayer />
        <FlyToVisibleBounds points={validProperties} />
        {validProperties.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getPropeaMapIcon('compact')} title={p.titulo} />
        ))}
      </MapContainer>
    </div>
  );
}
