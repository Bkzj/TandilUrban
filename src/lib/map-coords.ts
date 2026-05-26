export const TANDIL_CENTER: [number, number] = [-37.32167, -59.13316];

/** Coordenadas válidas para mapas (sin dependencia de Leaflet; usable en servidor). */
export function isValidMapLatLng(lat: unknown, lng: unknown): boolean {
  const la = typeof lat === 'number' ? lat : Number(lat);
  const ln = typeof lng === 'number' ? lng : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  if (la === 0 && ln === 0) return false;
  return true;
}

export function toLatLngPair(lat: unknown, lng: unknown): [number, number] | null {
  if (!isValidMapLatLng(lat, lng)) return null;
  return [Number(lat), Number(lng)];
}

/** Convierte puntos a pares [lat, lng] finitos y válidos. */
export function toValidLatLngPairs(
  points: ReadonlyArray<{ lat: unknown; lng: unknown }>,
): [number, number][] {
  const pairs: [number, number][] = [];
  for (const p of points) {
    const pair = toLatLngPair(p.lat, p.lng);
    if (pair) pairs.push(pair);
  }
  return pairs;
}

/** Filtra pares ya armados (p. ej. tras serialización o bugs de bounds). */
export function sanitizeLatLngPairs(
  positions: ReadonlyArray<[number, number]>,
): [number, number][] {
  const out: [number, number][] = [];
  for (const pos of positions) {
    if (!Array.isArray(pos) || pos.length < 2) continue;
    const pair = toLatLngPair(pos[0], pos[1]);
    if (pair) out.push(pair);
  }
  return out;
}

export function firstValidLatLng(
  positions: ReadonlyArray<[number, number]>,
): [number, number] {
  return sanitizeLatLngPairs(positions)[0] ?? TANDIL_CENTER;
}
