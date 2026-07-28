'use client';

import { useState, useTransition } from 'react';
import { Check, MapPin, Trash2 } from 'lucide-react';

import { ajustarVisitaFisica, eliminarVisitaFisicaEvento } from '@/actions/contacto';
import type { PropiedadEngagementMetrics, VisitaFisicaHistorialItem } from '@/lib/panel-seguimiento';

function fmtTimelineDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  contactoId: string;
  visitanteNombre: string;
  initialVisitasLead: number;
  initialEngagement: PropiedadEngagementMetrics;
  initialHistorialLead: VisitaFisicaHistorialItem[];
  /** Si se muestra el bloque de métricas de la propiedad (lead + totales). */
  showPropiedadMetrics?: boolean;
  initialVisitasFisicasPropiedad?: number;
  initialHistorialPropiedad?: VisitaFisicaHistorialItem[];
  onVisitasLeadChange?: (visitasFisicas: number) => void;
};

export function SeguimientoVisitasPanel({
  contactoId,
  initialVisitasLead,
  initialEngagement,
  initialHistorialLead,
  showPropiedadMetrics = true,
  initialVisitasFisicasPropiedad = 0,
  initialHistorialPropiedad = [],
  onVisitasLeadChange,
}: Props) {
  const [visitasLead, setVisitasLead] = useState(initialVisitasLead);
  const [visitasFisicasPropiedad, setVisitasFisicasPropiedad] = useState(initialVisitasFisicasPropiedad);
  const [engagement, setEngagement] = useState(initialEngagement);
  const [historialLead, setHistorialLead] = useState(initialHistorialLead);
  const [, setHistorialPropiedad] = useState(initialHistorialPropiedad);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  function applyResult(result: Extract<Awaited<ReturnType<typeof ajustarVisitaFisica>>, { ok: true }>) {
    setVisitasLead(result.visitasFisicas);
    setVisitasFisicasPropiedad(result.visitasFisicasPropiedad);
    setEngagement(result.engagement);
    setHistorialLead(result.historialLead);
    setHistorialPropiedad(result.historialPropiedad);
    onVisitasLeadChange?.(result.visitasFisicas);
  }

  function handleRegistrarVisita() {
    setError(null);
    const prevLead = visitasLead;
    const optimisticLead = prevLead + 1;
    setVisitasLead(optimisticLead);
    onVisitasLeadChange?.(optimisticLead);

    startTransition(async () => {
      const result = await ajustarVisitaFisica(contactoId, 1, crypto.randomUUID());
      if (!result.ok) {
        setVisitasLead(prevLead);
        onVisitasLeadChange?.(prevLead);
        setError(result.error);
        return;
      }
      applyResult(result);
    });
  }

  function handleEliminarVisita(eventoId: string) {
    setError(null);
    setDeletingEventId(eventoId);

    startTransition(async () => {
      const result = await eliminarVisitaFisicaEvento(eventoId, crypto.randomUUID());
      setDeletingEventId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applyResult(result);
    });
  }

  const visitasTimeline = historialLead;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md md:p-5">
      <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
        Seguimiento
      </h3>

      {showPropiedadMetrics ? (
        <>
          <MetricGroup
            title="Rendimiento de la Propiedad"
            metrics={[
              { label: 'Vistas Web', value: engagement.visitasWeb },
              { label: 'Total Interesados', value: visitasFisicasPropiedad },
            ]}
          />

          <MetricGroup
            title="Actividad de este Lead"
            className="mt-5"
            metrics={[
              { label: 'Consultas enviadas', value: engagement.consultas, accent: false },
              { label: 'Visitas realizadas', value: visitasLead, accent: true },
            ]}
          />
        </>
      ) : null}

      <p className="mt-5 rounded-xl border border-green-900/30 bg-[#0A2A1A]/50 p-4 text-sm text-white">
        Actividad registrada: {engagement.actividadRegistrada}. Suma descriptiva de
        visualizaciones, consultas y visitas físicas; no representa personas únicas.
      </p>

      <div className="mt-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold text-white">Historial de Visitas</h4>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRegistrarVisita}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-naranja/50 bg-[#0A2A1A] px-4 py-2.5 text-xs font-semibold text-naranja-light transition hover:border-naranja hover:bg-[#0A2A1A]/80 disabled:opacity-50"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Registrar nueva visita
          </button>
        </div>

        {error ? (
          <p className="mb-2 text-xs text-naranja-light" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="rounded-xl border border-white/10 bg-white/5 p-3">
          {visitasTimeline.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-white/45">
              Todavía no hay visitas registradas para este prospecto.
            </li>
          ) : (
            visitasTimeline.map((item) => (
              <li
                key={item.id}
                className="group flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0"
              >
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      {item.delta > 0 ? 'Visita presencial realizada' : 'Visita presencial anulada'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {fmtTimelineDate(item.createdAt)} · Agente: {item.registradoPorNombre}
                    </p>
                  </div>
                </div>
                {item.delta > 0 ? <button
                  type="button"
                  title="Eliminar registro"
                  disabled={isPending && deletingEventId === item.id}
                  onClick={() => handleEliminarVisita(item.id)}
                  className="rounded-md p-2 text-gray-500 opacity-60 transition-opacity hover:bg-red-400/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Eliminar registro</span>
                </button> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function MetricGroup({
  title,
  metrics,
  className = '',
}: {
  title: string;
  metrics: { label: string; value: number; accent?: boolean }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-gray-400">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <MetricPill
            key={metric.label}
            label={metric.label}
            value={metric.value}
            accent={metric.accent}
          />
        ))}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 text-center backdrop-blur-md ${
        accent ? 'border-naranja/35 bg-naranja/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? 'text-naranja-light' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
