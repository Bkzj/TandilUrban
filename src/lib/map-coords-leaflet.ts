'use client';

import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

import {
  firstValidLatLng,
  isValidMapLatLng,
  sanitizeLatLngPairs,
  TANDIL_CENTER,
} from '@/lib/map-coords';

function mapHasLayout(map: LeafletMap): boolean {
  const { x, y } = map.getSize();
  return x > 0 && y > 0;
}

function safeLatLng(lat: number, lng: number): L.LatLng | null {
  if (!isValidMapLatLng(lat, lng)) return null;
  try {
    const ll = L.latLng(lat, lng);
    if (!Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) return null;
    return ll;
  } catch {
    return null;
  }
}

function safeFlyTo(
  map: LeafletMap,
  latlng: [number, number],
  zoom: number,
  options?: { duration?: number },
): void {
  const ll = safeLatLng(latlng[0], latlng[1]);
  const target = ll ?? safeLatLng(TANDIL_CENTER[0], TANDIL_CENTER[1]);
  if (!target) return;

  const duration = options?.duration ?? 1.2;

  if (!mapHasLayout(map)) {
    map.setView(target, zoom);
    return;
  }

  try {
    map.flyTo(target, zoom, { duration });
  } catch {
    map.setView(target, zoom);
  }
}

function boundsAreFlyable(bounds: L.LatLngBounds): boolean {
  if (typeof bounds.isValid === 'function' && !bounds.isValid()) return false;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return (
    Number.isFinite(sw.lat) &&
    Number.isFinite(sw.lng) &&
    Number.isFinite(ne.lat) &&
    Number.isFinite(ne.lng)
  );
}

function boundsCollapsed(bounds: L.LatLngBounds): boolean {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return (
    Math.abs(sw.lat - ne.lat) < 1e-9 && Math.abs(sw.lng - ne.lng) < 1e-9
  );
}

function safeFitBounds(
  map: LeafletMap,
  bounds: L.LatLngBounds,
  options: { duration?: number; maxZoom?: number },
): void {
  const duration = options.duration ?? 1.5;
  const maxZoom = options.maxZoom ?? 16;

  if (!mapHasLayout(map)) {
    const c = bounds.getCenter();
    safeFlyTo(map, [c.lat, c.lng], Math.min(maxZoom, 15), { duration });
    return;
  }

  try {
    map.flyToBounds(bounds, {
      padding: [50, 50],
      duration,
      maxZoom,
    });
  } catch {
    try {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom });
    } catch {
      const c = bounds.getCenter();
      safeFlyTo(map, [c.lat, c.lng], 14, { duration });
    }
  }
}

/**
 * Encuadra el mapa sin lanzar si hay bounds degenerados o coordenadas inválidas.
 * Solo importar desde componentes cliente (Leaflet requiere `window`).
 */
export function flyMapToPositions(
  map: LeafletMap,
  positions: [number, number][],
  options?: { duration?: number; maxZoom?: number },
): void {
  const duration = options?.duration ?? 1.5;
  const maxZoom = options?.maxZoom ?? 16;
  const valid = sanitizeLatLngPairs(positions);

  if (valid.length === 0) {
    safeFlyTo(map, TANDIL_CENTER, 13, { duration: Math.min(duration, 1.2) });
    return;
  }

  if (valid.length === 1) {
    safeFlyTo(map, valid[0], 15, { duration });
    return;
  }

  const latLngs = valid
    .map(([la, ln]) => safeLatLng(la, ln))
    .filter((ll): ll is L.LatLng => ll != null);

  if (latLngs.length === 0) {
    safeFlyTo(map, TANDIL_CENTER, 13, { duration });
    return;
  }

  if (latLngs.length === 1) {
    safeFlyTo(map, [latLngs[0].lat, latLngs[0].lng], 15, { duration });
    return;
  }

  try {
    const bounds = L.latLngBounds(latLngs);
    if (!boundsAreFlyable(bounds)) {
      safeFlyTo(map, firstValidLatLng(valid), 14, { duration });
      return;
    }

    if (boundsCollapsed(bounds)) {
      const sw = bounds.getSouthWest();
      safeFlyTo(map, [sw.lat, sw.lng], 15, { duration });
      return;
    }

    safeFitBounds(map, bounds, { duration, maxZoom });
  } catch {
    safeFlyTo(map, firstValidLatLng(valid), 14, { duration });
  }
}

/** Ejecuta `fn` cuando el contenedor del mapa tiene tamaño (evita NaN en proyección). */
export function runWhenMapReady(map: LeafletMap, fn: () => void): void {
  const attempt = () => {
    map.invalidateSize();
    if (mapHasLayout(map)) {
      fn();
      return;
    }
    map.once('resize', attempt);
  };
  map.whenReady(attempt);
}
