/** Formato de distancia para listados (sin dependencias de Leaflet). */
export function formatDistanciaCercania(metros: number): string {
  if (metros >= 1000) {
    const km = metros / 1000;
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
    return `${rounded} km`;
  }
  return `${metros}m`;
}
