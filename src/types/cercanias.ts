/** Coordenada Leaflet: [latitud, longitud] */
export type LatLngTuple = [number, number];

export type PoiConDistancia = {
  nombre: string;
  lat: number;
  lng: number;
  distanciaMetros: number;
};

export type TransporteCercano = {
  id: string;
  nombre: string;
  color: string;
  /** Segmentos recortados a 700 m (trazos discontinuos para Leaflet). */
  segments: LatLngTuple[][];
  distanciaMetros: number;
  linea?: string;
};

export type PoisCercanosResult = {
  educacion: PoiConDistancia[];
  salud: PoiConDistancia[];
  parques: PoiConDistancia[];
  seguridad: PoiConDistancia[];
  supermercados: PoiConDistancia[];
  transporte: TransporteCercano[];
};

export type CercaniasCategoryKey = keyof PoisCercanosResult;

export type CercaniasResponse = {
  origen: { lat: number; lng: number };
  radioMetros: number;
  categorias: PoisCercanosResult;
};

export const CERCANIAS_CATEGORY_ORDER: CercaniasCategoryKey[] = [
  'educacion',
  'supermercados',
  'transporte',
  'parques',
  'salud',
  'seguridad',
];

export const CERCANIAS_POINT_CATEGORIES = CERCANIAS_CATEGORY_ORDER.filter(
  (k) => k !== 'transporte'
) as Exclude<CercaniasCategoryKey, 'transporte'>[];

export const CERCANIAS_CATEGORY_LABELS: Record<CercaniasCategoryKey, string> = {
  educacion: 'Educación',
  supermercados: 'Supermercados',
  transporte: 'Transporte',
  parques: 'Parques',
  salud: 'Salud',
  seguridad: 'Seguridad',
};

export function isTransportLineKey(key: string): boolean {
  return key.startsWith('linea-');
}

export function getTransportLineId(line: Pick<TransporteCercano, 'id' | 'linea' | 'nombre'>): string {
  return line.id;
}

/** Categorías de puntos con datos (sin transporte). */
export function categoriasPuntoConDatos(categorias: PoisCercanosResult): Exclude<
  CercaniasCategoryKey,
  'transporte'
>[] {
  return CERCANIAS_POINT_CATEGORIES.filter((key) => categorias[key].length > 0);
}

/** Estado inicial del mapa: puntos activos, colectivos apagados. */
export function categoriasPuntoActivasIniciales(categorias: PoisCercanosResult): string[] {
  return categoriasPuntoConDatos(categorias);
}

export function categoriasConDatos(categorias: PoisCercanosResult): CercaniasCategoryKey[] {
  const out: CercaniasCategoryKey[] = categoriasPuntoConDatos(categorias);
  if (categorias.transporte.length > 0) out.push('transporte');
  return out;
}

/** Normaliza paths del JSON a array de trazos [lat,lng][]. */
export function normalizeTransportPaths(
  paths: LatLngTuple[] | LatLngTuple[][]
): LatLngTuple[][] {
  if (!paths?.length) return [];
  const first = paths[0];
  if (Array.isArray(first) && typeof first[0] === 'number') {
    return [paths as LatLngTuple[]];
  }
  return paths as LatLngTuple[][];
}
