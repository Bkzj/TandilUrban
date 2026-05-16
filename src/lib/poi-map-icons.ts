import L from 'leaflet';

import type { CercaniasCategoryKey } from '@/types/cercanias';

/** Verde principal de marca TandilUrban */
const VERDE = '#1C5E3C';

const SVG: Record<CercaniasCategoryKey, string> = {
  educacion: `<path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" stroke="currentColor" stroke-width="1.75" fill="none"/>`,
  supermercados: `<circle cx="9" cy="21" r="1" fill="currentColor"/><circle cx="20" cy="21" r="1" fill="currentColor"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  transporte: `<path d="M4 6h16v8H4zM6 14v2M18 14v2M8 10h.01M16 10h.01" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  parques: `<path d="M12 22v-7M6 12l6-8 6 8M4 14h16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  salud: `<path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.75" fill="none"/>`,
  seguridad: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function buildPoiMarkerHtml(categoria: CercaniasCategoryKey): string {
  const svg =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    SVG[categoria] +
    '</svg>';
  return (
    '<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.12);border:2px solid ' +
    VERDE +
    ';color:' +
    VERDE +
    '">' +
    svg +
    '</div>'
  );
}

const iconCache = new Map<CercaniasCategoryKey, L.DivIcon>();

export function getPoiDivIcon(categoria: CercaniasCategoryKey): L.DivIcon {
  const cached = iconCache.get(categoria);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'poi-marker-leaflet',
    html: buildPoiMarkerHtml(categoria),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });

  iconCache.set(categoria, icon);
  return icon;
}
