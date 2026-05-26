'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L, { type DragEndEvent } from 'leaflet';

type LocationMapProps = {
  center: [number, number];
  onMarkerDrag: (lat: number, lng: number) => void;
};

/** Pin de marca Propea Group (piedra / pin inmobiliario). */
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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export function LocationMap({ center, onMarkerDrag }: LocationMapProps) {
  const markerIcon = useMemo(() => tandilIcon, []);

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border !border-surface/10 z-0">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} />
        <Marker
          position={center}
          draggable={true}
          icon={markerIcon}
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

export default LocationMap;
