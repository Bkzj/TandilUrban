import fs from 'fs/promises';
import path from 'path';

import {
  normalizeTransportPaths,
  type LatLngTuple,
  type PoiConDistancia,
  type PoisCercanosResult,
  type TransporteCercano,
} from '@/types/cercanias';

export type TandilPoiPunto = {
  nombre: string;
  lat: number;
  lng: number;
  extraData?: Record<string, unknown>;
};

export type TandilTransporteRuta = {
  categoria: 'transporte';
  id?: string;
  nombre: string;
  color: string;
  paths: LatLngTuple[] | LatLngTuple[][];
  linea?: string;
  lat?: number;
  lng?: number;
  extraData?: Record<string, unknown>;
};

export type TandilPoisByCategory = {
  educacion: TandilPoiPunto[];
  salud: TandilPoiPunto[];
  parques: TandilPoiPunto[];
  seguridad: TandilPoiPunto[];
  supermercados: TandilPoiPunto[];
  transporte: TandilTransporteRuta[];
};

export type { PoiConDistancia, PoisCercanosResult, TransporteCercano, LatLngTuple };

const POI_FILE = path.join(process.cwd(), 'public/data/tandil-pois.json');
const TOP_PER_CATEGORY = 3;
const TRANSPORT_LINE_NEAR_M = 700;
const EARTH_RADIUS_M = 6_371_000;

let cachedPois: TandilPoisByCategory | null = null;

export function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function minDistanciaAPaths(lat: number, lng: number, pathLines: LatLngTuple[][]): number {
  let min = Infinity;
  for (const line of pathLines) {
    for (const [plat, plng] of line) {
      min = Math.min(min, calcularDistanciaHaversine(lat, lng, plat, plng));
    }
  }
  return min;
}

/**
 * Agrupa vértices consecutivos dentro de `maxDistMeters`.
 * Si un vértice se aleja, cierra el segmento; si vuelve a entrar, abre uno nuevo.
 */
export function cropTransportSegments(
  lat: number,
  lng: number,
  pathLines: LatLngTuple[][],
  maxDistMeters = TRANSPORT_LINE_NEAR_M
): LatLngTuple[][] {
  const segments: LatLngTuple[][] = [];

  for (const line of pathLines) {
    let current: LatLngTuple[] = [];

    for (const [plat, plng] of line) {
      const dist = calcularDistanciaHaversine(lat, lng, plat, plng);

      if (dist <= maxDistMeters) {
        current.push([plat, plng]);
      } else if (current.length >= 2) {
        segments.push(current);
        current = [];
      } else {
        current = [];
      }
    }

    if (current.length >= 2) {
      segments.push(current);
    }
  }

  return segments;
}

function transportRouteId(route: TandilTransporteRuta): string {
  if (route.id) return route.id;
  const linea = route.linea ?? route.nombre;
  const color = route.extraData?.color ?? '';
  return `linea-${linea}-${color}`.replace(/\s+/g, '-');
}

function isPuntoRecord(value: unknown): value is TandilPoiPunto {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.nombre === 'string' &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng) &&
    !Array.isArray(o.paths)
  );
}

function isTransporteRecord(value: unknown): value is TandilTransporteRuta {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.nombre === 'string' && Array.isArray(o.paths) && o.paths.length > 0;
}

async function loadTandilPois(): Promise<TandilPoisByCategory> {
  if (cachedPois) return cachedPois;

  let raw: string;
  try {
    raw = await fs.readFile(POI_FILE, 'utf8');
  } catch {
    throw new Error(
      'No se encontró public/data/tandil-pois.json. Ejecutá: npm run geo:process'
    );
  }

  const parsed = JSON.parse(raw) as Partial<Record<keyof TandilPoisByCategory, unknown[]>>;
  const empty: TandilPoisByCategory = {
    educacion: [],
    salud: [],
    parques: [],
    seguridad: [],
    supermercados: [],
    transporte: [],
  };

  for (const key of Object.keys(empty) as (keyof TandilPoisByCategory)[]) {
    const list = parsed[key];
    if (!Array.isArray(list)) continue;

    if (key === 'transporte') {
      empty.transporte = list.filter(isTransporteRecord);
    } else {
      empty[key] = list.filter(isPuntoRecord);
    }
  }

  cachedPois = empty;
  return cachedPois;
}

function processPuntosCercanos(
  lat: number,
  lng: number,
  items: TandilPoiPunto[],
  radioMetros: number
): PoiConDistancia[] {
  const withDistance: PoiConDistancia[] = [];

  for (const poi of items) {
    const distanciaMetros = calcularDistanciaHaversine(lat, lng, poi.lat, poi.lng);
    if (distanciaMetros <= radioMetros) {
      withDistance.push({
        nombre: poi.nombre,
        lat: poi.lat,
        lng: poi.lng,
        distanciaMetros: Math.round(distanciaMetros),
      });
    }
  }

  withDistance.sort((a, b) => a.distanciaMetros - b.distanciaMetros);
  return withDistance.slice(0, TOP_PER_CATEGORY);
}

function processTransporteCercano(
  lat: number,
  lng: number,
  routes: TandilTransporteRuta[]
): TransporteCercano[] {
  const cercanas: TransporteCercano[] = [];

  for (const route of routes) {
    const pathLines = normalizeTransportPaths(route.paths);
    if (pathLines.length === 0) continue;

    const distanciaMetros = minDistanciaAPaths(lat, lng, pathLines);
    if (distanciaMetros > TRANSPORT_LINE_NEAR_M) continue;

    const segments = cropTransportSegments(lat, lng, pathLines, TRANSPORT_LINE_NEAR_M);
    if (segments.length === 0) continue;

    cercanas.push({
      id: transportRouteId(route),
      nombre: route.nombre,
      color: route.color,
      segments,
      distanciaMetros: Math.round(distanciaMetros),
      linea: route.linea,
    });
  }

  cercanas.sort((a, b) => a.distanciaMetros - b.distanciaMetros);
  return cercanas;
}

export async function getPOIsCercanos(
  lat: number,
  lng: number,
  radioMetros = 1000
): Promise<PoisCercanosResult> {
  const data = await loadTandilPois();

  return {
    educacion: processPuntosCercanos(lat, lng, data.educacion, radioMetros),
    salud: processPuntosCercanos(lat, lng, data.salud, radioMetros),
    parques: processPuntosCercanos(lat, lng, data.parques, radioMetros),
    seguridad: processPuntosCercanos(lat, lng, data.seguridad, radioMetros),
    supermercados: processPuntosCercanos(lat, lng, data.supermercados, radioMetros),
    transporte: processTransporteCercano(lat, lng, data.transporte),
  };
}
