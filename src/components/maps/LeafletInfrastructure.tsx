'use client';

import 'leaflet/dist/leaflet.css';

import { TileLayer } from 'react-leaflet';

export const PROPEA_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const PROPEA_TILE_ATTRIBUTION = '&copy; OpenStreetMap';

export function PropeaMapTileLayer() {
  return <TileLayer attribution={PROPEA_TILE_ATTRIBUTION} url={PROPEA_TILE_URL} />;
}
