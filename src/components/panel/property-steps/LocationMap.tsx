'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import L, { type DragEndEvent } from 'leaflet';

import { PropeaMapTileLayer } from '@/components/maps/LeafletInfrastructure';
import { getPropeaMapIcon } from '@/lib/propea-map-icon';
type LocationMapProps = {
  center: [number, number];
  onMarkerDrag: (lat: number, lng: number) => void;
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export function LocationMap({ center, onMarkerDrag }: LocationMapProps) {
  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-white/10 z-0">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '400px', width: '100%' }}
      >
        <PropeaMapTileLayer />
        <MapUpdater center={center} />
        <Marker
          position={center}
          draggable={true}
          icon={getPropeaMapIcon()}
          eventHandlers={{
            dragend: (e: DragEndEvent) => {
              const marker = e.target as L.Marker;
              const position = marker.getLatLng();
              onMarkerDrag(position.lat, position.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
