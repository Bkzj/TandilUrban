'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar cercanías.');
        setCategorias(null);
        setActiveCategorias([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [lat, lng, radioMetros]);

  const pointCategories = useMemo(
    () => (categorias ? categoriasPuntoConDatos(categorias) : []),
    [categorias]
  );

  const busLines = useMemo(() => categorias?.transporte ?? [], [categorias]);

  const hasFilters = pointCategories.length > 0 || busLines.length > 0;

  const toggleFilter = useCallback((key: string) => {
    setActiveCategorias((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  return (
    <section className="space-y-6">
      <PropiedadUbicacionMap
        titulo={titulo}
        latitud={lat}
        longitud={lng}
        pois={categorias}
        activeCategorias={activeCategorias}
      />

      {!loading && hasFilters ? (
        <div
          className="flex gap-2 overflow-x-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filtrar puntos de interés y líneas de colectivo en el mapa"
        >
          {pointCategories.map((categoria) => {
            const activo = activeCategorias.includes(categoria);
            const label = CERCANIAS_CATEGORY_LABELS[categoria as CercaniasCategoryKey];
            return (
              <button
                key={categoria}
                type="button"
                onClick={() => toggleFilter(categoria)}
                aria-pressed={activo}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activo
                    ? 'border-verde bg-verde text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-verde'
                }`}
              >
                {label}
              </button>
            );
          })}

          {busLines.map((line) => {
            const lineId = getTransportLineId(line);
            const activo = activeCategorias.includes(lineId);
            const label = line.linea ? `Línea ${line.linea}` : line.nombre;

            return (
              <button
                key={lineId}
                type="button"
                onClick={() => toggleFilter(lineId)}
                aria-pressed={activo}
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
      ) : null}

      <PropertyCercanias categorias={categorias} loading={loading} error={error} />
    </section>
  );
}
