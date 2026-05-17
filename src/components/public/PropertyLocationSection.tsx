'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, ChevronDown, Info } from 'lucide-react';

import { PropiedadUbicacionMap } from '@/components/propiedades/PropiedadUbicacionMap';
import PropertyCercanias from '@/components/public/PropertyCercanias';
import {
  CERCANIAS_CATEGORY_LABELS,
  categoriasPuntoActivasIniciales,
  categoriasPuntoConDatos,
  getTransportLineId,
  type CercaniasCategoryKey,
  type CercaniasResponse,
  type PoisCercanosResult,
} from '@/types/cercanias';

type PropertyLocationSectionProps = {
  lat: number;
  lng: number;
  titulo: string;
  radioMetros?: number;
};

const SCROLL_STRIP_CLASS =
  'flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const PILL_POINT_ACTIVE = 'border-verde bg-verde text-white';
const PILL_POINT_INACTIVE = 'border-gray-200 bg-white text-gray-600 hover:border-verde';

export default function PropertyLocationSection({
  lat,
  lng,
  titulo,
  radioMetros = 1000,
}: PropertyLocationSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<PoisCercanosResult | null>(null);
  const [activeCategorias, setActiveCategorias] = useState<string[]>([]);
  const [isTransportOpen, setIsTransportOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radio: String(radioMetros),
        });
        const res = await fetch(`/api/public/cercanias?${params}`, { signal: controller.signal });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'No se pudo cargar el entorno cercano.');
        }

        const data = (await res.json()) as CercaniasResponse;
        setCategorias(data.categorias);
        setActiveCategorias(categoriasPuntoActivasIniciales(data.categorias));
        setIsTransportOpen(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar cercanías.');
        setCategorias(null);
        setActiveCategorias([]);
        setIsTransportOpen(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [lat, lng, radioMetros]);

  const poisPuntos = useMemo(
    () => (categorias ? categoriasPuntoConDatos(categorias) : []),
    [categorias]
  );

  const poisTransporte = useMemo(() => categorias?.transporte ?? [], [categorias]);

  const hasFilters = poisPuntos.length > 0 || poisTransporte.length > 0;

  const toggleFilter = useCallback((key: string) => {
    setActiveCategorias((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  return (
    <section className="w-full min-w-0 space-y-6 overflow-hidden">
      <PropiedadUbicacionMap
        titulo={titulo}
        latitud={lat}
        longitud={lng}
        pois={categorias}
        activeCategorias={activeCategorias}
      />

      {!loading && hasFilters ? (
        <div className="space-y-1">
          <p className="mb-3 flex items-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            Seleccioná los puntos de interés para verlos en el mapa.
          </p>

          {poisPuntos.length > 0 ? (
            <div
              className={SCROLL_STRIP_CLASS}
              role="group"
              aria-label="Filtrar categorías de puntos de interés"
            >
              {poisPuntos.map((categoria) => {
                const activo = activeCategorias.includes(categoria);
                const label = CERCANIAS_CATEGORY_LABELS[categoria as CercaniasCategoryKey];
                return (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => toggleFilter(categoria)}
                    aria-pressed={activo}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      activo ? PILL_POINT_ACTIVE : PILL_POINT_INACTIVE
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {poisTransporte.length > 0 ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsTransportOpen((open) => !open)}
                aria-expanded={isTransportOpen}
                className="flex items-center gap-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-verde"
              >
                <Bus className="h-4 w-4 shrink-0" aria-hidden />
                Transporte Público
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    isTransportOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isTransportOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className={`${SCROLL_STRIP_CLASS} pb-2 pt-1 transition-opacity duration-200 ${
                      isTransportOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    role="group"
                    aria-label="Filtrar líneas de colectivo"
                    aria-hidden={!isTransportOpen}
                  >
                    {poisTransporte.map((line) => {
                      const lineId = getTransportLineId(line);
                      const activo = activeCategorias.includes(lineId);
                      const label = line.linea ? `Línea ${line.linea}` : line.nombre;

                      return (
                        <button
                          key={lineId}
                          type="button"
                          onClick={() => toggleFilter(lineId)}
                          aria-pressed={activo}
                          tabIndex={isTransportOpen ? 0 : -1}
                          className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: activo ? line.color : 'transparent',
                            borderColor: line.color,
                            color: activo ? '#ffffff' : line.color,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <PropertyCercanias categorias={categorias} loading={loading} error={error} />
    </section>
  );
}
