'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';

import type { StepProps } from '@/types/panel';

import { DEFAULT_CENTER } from './constants';
import { StepHeading } from './step-ui';

const LocationMap = dynamic(
  () => import('./LocationMap').then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative z-0 flex h-[400px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 text-sm text-surface/60">
        Cargando mapa…
      </div>
    ),
  }
);

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

/** Geofencing silencioso: sesga la consulta a Tandil si el usuario no lo menciona. */
function buildTandilSearchQuery(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.toLowerCase().includes('tandil')
    ? trimmed
    : `${trimmed}, Tandil, Buenos Aires, Argentina`;
}

/** Dirección visible: respeta intersección escrita por el usuario o acorta OSM. */
function resolveDireccionFromPick(
  queryTrimmed: string,
  item: NominatimResult
): string {
  if (queryTrimmed.toLowerCase().includes(' y ')) {
    return queryTrimmed;
  }
  return item.display_name.split(',').slice(0, 2).join(', ').trim();
}

export function StepUbicacion({ data, update, isEditMode }: StepProps) {
  const query = data.direccion ?? '';
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const lat = data.lat ?? DEFAULT_CENTER.lat;
  const lng = data.lng ?? DEFAULT_CENTER.lng;
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  const queryTrimmed = query.trim();
  const canSearch = queryTrimmed.length >= 3;
  const visibleSuggestions = canSearch ? suggestions : [];
  const visibleSearching = canSearch && isSearching;

  useEffect(() => {
    if (!canSearch) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const searchQuery = buildTandilSearchQuery(queryTrimmed);
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`;
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!res.ok) {
            setSuggestions([]);
            return;
          }
          const results = (await res.json()) as NominatimResult[];
          setSuggestions(Array.isArray(results) ? results : []);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [canSearch, queryTrimmed]);

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 3) {
      setError('Ingresá al menos 3 caracteres.');
      return;
    }
    setError(null);
    setSearching(true);
    setSuggestions([]);
    try {
      const searchQuery = buildTandilSearchQuery(q);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('No pudimos buscar la dirección.');
      const results = (await res.json()) as NominatimResult[];
      if (!results.length) {
        setError('No encontramos coincidencias. Probá con otra búsqueda.');
        return;
      }
      const first = results[0];
      const newLat = parseFloat(first.lat);
      const newLng = parseFloat(first.lon);
      update('lat', newLat);
      update('lng', newLng);
      update('direccion', resolveDireccionFromPick(q, first));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos buscar la dirección.');
    } finally {
      setSearching(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSearch();
  }

  async function pickManualOption() {
    const q = query;
    const trimmed = q.trim();

    const yIdx = trimmed.toLowerCase().indexOf(' y ');
    if (yIdx !== -1) {
      const primeraCalle = q.slice(0, yIdx).trim();
      if (primeraCalle) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${primeraCalle}, Tandil`)}`;
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (res.ok) {
            const results = (await res.json()) as NominatimResult[];
            if (Array.isArray(results) && results.length > 0) {
              const first = results[0];
              update('lat', parseFloat(first.lat));
              update('lng', parseFloat(first.lon));
            }
          }
        } catch {
          /* pin queda donde estaba */
        }
      }
    }

    update('direccion', q);
    setSuggestions([]);
    setError(null);
  }

  function pickSuggestion(item: NominatimResult) {
    const q = query.trim();
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    update('lat', newLat);
    update('lng', newLng);
    update('direccion', resolveDireccionFromPick(q, item));
    setSuggestions([]);
    setError(null);
  }

  const showSuggestionList = query.trim().length >= 3;

  return (
    <>
      <StepHeading>
        {isEditMode ? 'Ajustá la ubicación exacta en el mapa' : '¿Dónde está ubicada?'}
      </StepHeading>

      <form onSubmit={onSubmit} className="w-full">
        <div className="relative z-[60] mb-8 w-full">
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 !text-white !border-b-[3px] focus:!border-naranja outline-none transition-colors placeholder:!text-surface/50"
            placeholder="Buscar dirección (ej. Mitre 450, Tandil)..."
            value={query}
            onChange={(e) => update('direccion', e.target.value)}
            disabled={searching}
            autoFocus
            autoComplete="off"
            aria-haspopup="listbox"
          />
          {visibleSearching ? (
            <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs !text-surface/60">
              Buscando…
            </p>
          ) : null}

          {showSuggestionList ? (
            <ul
              className="absolute top-[calc(100%+16px)] left-0 w-full z-[100] max-h-60 overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-3xl saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-white"
              role="listbox"
            >
              <li
                key="manual-suggestion"
                role="option"
                aria-selected={false}
                tabIndex={0}
                className="cursor-pointer rounded-xl p-3 transition-colors hover:bg-white/10"
                onClick={() => void pickManualOption()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void pickManualOption();
                  }
                }}
              >
                {`📍 Dirección no encontrada. Usar "${query}" y ubicar pin manualmente`}
              </li>
              {visibleSuggestions.map((item, index) => (
                <li
                  key={`${item.lat}-${item.lon}-${index}`}
                  role="option"
                  aria-selected={false}
                  tabIndex={0}
                  className="cursor-pointer rounded-xl p-3 transition-colors hover:bg-white/10"
                  onClick={() => pickSuggestion(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      pickSuggestion(item);
                    }
                  }}
                >
                  {item.display_name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="-mt-3 mb-3 text-sm text-naranja-light">{error}</p>
      ) : null}

      <LocationMap
        center={center}
        onMarkerDrag={(newLat, newLng) => {
          update('lat', newLat);
          update('lng', newLng);
        }}
      />

      <p className="mt-3 text-xs text-surface/55">
        Buscá la dirección o arrastrá el marcador para ajustar la ubicación exacta.
      </p>
    </>
  );
}
