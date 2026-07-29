import 'client-only';

import L from 'leaflet';

type PropeaMapIconSize = 'compact' | 'standard';

const iconCache = new Map<PropeaMapIconSize, L.DivIcon>();

export function getPropeaMapIcon(size: PropeaMapIconSize = 'standard'): L.DivIcon {
  const cached = iconCache.get(size);
  if (cached) return cached;

  const pixels = size === 'compact' ? 36 : 40;
  const roof =
    size === 'standard'
      ? '<path d="M10 10.5L11.5 9L13.5 11" stroke="#957327" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      : '';
  const icon = L.divIcon({
    className: size === 'compact' ? 'explorer-map-pin' : 'custom-tandil-pin',
    html: `<svg width="${pixels}" height="${pixels}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C12 22 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 12 22 12 22Z" fill="#957327" stroke="#12422A" stroke-width="2"/>
      <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="#F5F6F4"/>
      ${roof}
    </svg>`,
    iconSize: [pixels, pixels],
    iconAnchor: [pixels / 2, pixels],
  });
  iconCache.set(size, icon);
  return icon;
}
