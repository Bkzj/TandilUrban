'use client';

import { useMemo } from 'react';

import { useClientMounted } from '@/hooks/use-client-mounted';
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet';

import { PropeaMapTileLayer } from '@/components/maps/LeafletInfrastructure';
import { LeafletMapLoading } from '@/components/maps/LeafletMapLoading';
import { formatDistanciaCercania } from '@/lib/cercanias-format';
import { getPoiDivIcon } from '@/lib/poi-map-icons';
import { getPropeaMapIcon } from '@/lib/propea-map-icon';
import type { CercaniasCategoryKey, PoisCercanosResult } from '@/types/cercanias';

type PoiMarker = {
  id: string;
  lat: number;
  lng: number;
  categoria: CercaniasCategoryKey;
  nombre: string;
  distanciaMetros: number;
};

type Props = {
  titulo: string;
  latitud: number;
  longitud: number;
  pois?: PoisCercanosResult | null;
  activeCategorias?: string[];
};

function flattenPointPois(
  pois: PoisCercanosResult | null | undefined,
  activeCategorias: string[] | undefined
): PoiMarker[] {
  if (!pois || !activeCategorias?.length) return [];

  const active = new Set(activeCategorias);
  const markers: PoiMarker[] = [];

  for (const categoria of Object.keys(pois) as CercaniasCategoryKey[]) {
    if (categoria === 'transporte') continue;
    if (!active.has(categoria)) continue;

    const list = pois[categoria];
    if (!Array.isArray(list)) continue;

    list.forEach((poi, index) => {
      if (!Number.isFinite(poi.lat) || !Number.isFinite(poi.lng)) return;
      markers.push({
        id: `${categoria}-${poi.nombre}-${poi.lat}-${poi.lng}-${index}`,
        lat: poi.lat,
        lng: poi.lng,
        categoria,
        nombre: poi.nombre,
        distanciaMetros: poi.distanciaMetros,
      });
    });
  }

  return markers;
}

/** Zoom base del listado; +2 niveles para ver la calle al abrir la ficha. */
const PROPERTY_DETAIL_MAP_ZOOM = 16;

export default function PropiedadUbicacionMapInner({
  titulo,
  latitud,
  longitud,
  pois,
  activeCategorias = [],
}: Props) {
  const isMounted = useClientMounted();
  const activeSet = useMemo(() => new Set(activeCategorias), [activeCategorias]);

  const centro = useMemo<[number, number]>(() => {
    const lat = Number.isFinite(latitud) ? latitud : -37.3217;
    const lng = Number.isFinite(longitud) ? longitud : -59.1332;
    return [lat, lng];
  }, [latitud, longitud]);

  const poiMarkers = useMemo(
    () => flattenPointPois(pois, activeCategorias),
    [pois, activeCategorias]
  );

  const activeBusLines = useMemo(() => {
    if (!pois?.transporte?.length) return [];
    return pois.transporte.filter((line) => activeSet.has(line.id));
  }, [pois, activeSet]);

  if (!isMounted) {
    return <LeafletMapLoading />;
  }

  return (
    <MapContainer
      center={centro}
      zoom={PROPERTY_DETAIL_MAP_ZOOM}
      scrollWheelZoom={false}
      className="z-0 h-full w-full"
    >
      <PropeaMapTileLayer />

      {Number.isFinite(latitud) && Number.isFinite(longitud) ? (
        <Marker position={[latitud, longitud]} icon={getPropeaMapIcon()} zIndexOffset={1000}>
          <Popup className="text-center font-sans">
            <strong className="block text-lg text-verde">{titulo}</strong>
            <span className="block text-xs uppercase text-text-secondary">Ubicación exacta</span>
          </Popup>
        </Marker>
      ) : null}

      {activeBusLines.map((line) =>
        line.segments.length > 0 ? (
          <Polyline
            key={line.id}
            positions={line.segments}
            pathOptions={{
              color: line.color,
              weight: 5,
              opacity: 0.9,
            }}
          />
        ) : null
      )}

      {poiMarkers.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={getPoiDivIcon(poi.categoria)}
          zIndexOffset={100}
        >
          <Popup className="font-sans">
            <strong className="block text-sm text-gray-900">{poi.nombre}</strong>
            <span className="mt-1 block text-xs text-gray-500">
              a {formatDistanciaCercania(poi.distanciaMetros)}
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
