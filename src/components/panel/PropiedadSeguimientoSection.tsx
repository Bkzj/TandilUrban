'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { getSeguimientoPropiedad } from '@/actions/contacto';
import type { PropiedadEngagementMetrics, VisitaFisicaHistorialItem } from '@/lib/panel-seguimiento';
import { buildPropiedadEngagement } from '@/lib/panel-seguimiento';

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  propiedadId: string;
  visitasWeb: number;
  consultas: number;
};

export function PropiedadSeguimientoSection({ propiedadId, visitasWeb, consultas }: Props) {
  const [loadedPropertyId, setLoadedPropertyId] = useState<string | null>(null);
  const loading = loadedPropertyId !== propiedadId;
  const [error, setError] = useState<string | null>(null);
  const [visitasFisicasPropiedad, setVisitasFisicasPropiedad] = useState(0);
  const [engagement, setEngagement] = useState<PropiedadEngagementMetrics>(() =>
    buildPropiedadEngagement(visitasWeb, consultas, 0, 0),
  );
  const [historial, setHistorial] = useState<VisitaFisicaHistorialItem[]>([]);
  const [historialOpen, setHistorialOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getSeguimientoPropiedad(propiedadId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setLoadedPropertyId(propiedadId);
        return;
      }
      setVisitasFisicasPropiedad(result.visitasFisicasPropiedad);
      setEngagement(result.engagement);
      setHistorial(result.historialPropiedad);
      setLoadedPropertyId(propiedadId);
    })();

    return () => {
      cancelled = true;
    };
  }, [propiedadId, visitasWeb, consultas]);

  const displayEngagement =
    loading && !error
      ? buildPropiedadEngagement(visitasWeb, consultas, 0, visitasFisicasPropiedad)
      : engagement;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">
        Seguimiento de la propiedad
      </h3>

      {loading ? (
        <p className="mt-3 text-xs text-white/50">Cargando visitas presenciales…</p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-white/70" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Vistas web" value={visitasWeb} />
        <Metric label="Consultas" value={consultas} />
        <Metric label="Visitas fís. (total)" value={visitasFisicasPropiedad} highlight />
        <Metric label="Índice de interés" value={displayEngagement.indiceInteres} highlight />
      </div>
      <p className="mt-2 text-[0.65rem] text-white/50">
        Vistas + consultas×2 + visitas físicas×3
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setHistorialOpen((v) => !v)}
          disabled={loading}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white transition hover:border-white/25 disabled:opacity-50"
          aria-expanded={historialOpen}
        >
          <span>Visitantes registrados ({historial.length})</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${historialOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {historialOpen ? (
          <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
            {historial.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-white/45">
                Todavía no hay visitas presenciales registradas.
              </li>
            ) : (
              historial.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-white"
                >
                  <div>
                    <span className="font-semibold">{item.visitanteNombre}</span>
                    <span className="ml-1.5 text-white/50">
                      {item.delta > 0 ? '+1' : '−1'}
                    </span>
                  </div>
                  <div className="text-right text-white/55">
                    <span className="block">{fmtDate(item.createdAt)}</span>
                    <span className="text-[0.65rem]">por {item.registradoPorNombre}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight ? 'border-naranja/40 bg-naranja/15' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
