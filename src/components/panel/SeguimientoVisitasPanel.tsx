'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, Footprints, Minus } from 'lucide-react';

import { ajustarVisitaFisica } from '@/actions/contacto';
import type { PropiedadEngagementMetrics, VisitaFisicaHistorialItem } from '@/lib/panel-seguimiento';

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
  visitanteNombre,
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
  const [historialPropiedad, setHistorialPropiedad] = useState(initialHistorialPropiedad);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialPropOpen, setHistorialPropOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyResult(result: Extract<Awaited<ReturnType<typeof ajustarVisitaFisica>>, { ok: true }>) {
    setVisitasLead(result.visitasFisicas);
    setVisitasFisicasPropiedad(result.visitasFisicasPropiedad);
    setEngagement(result.engagement);
    setHistorialLead(result.historialLead);
    setHistorialPropiedad(result.historialPropiedad);
    onVisitasLeadChange?.(result.visitasFisicas);
  }

  function handleAjustar(delta: 1 | -1) {
    setError(null);
    const prevLead = visitasLead;
    const optimisticLead = Math.max(0, prevLead + delta);
    setVisitasLead(optimisticLead);
    onVisitasLeadChange?.(optimisticLead);

    startTransition(async () => {
      const result = await ajustarVisitaFisica(contactoId, delta);
      if (!result.ok) {
        setVisitasLead(prevLead);
        onVisitasLeadChange?.(prevLead);
        setError(result.error);
        return;
      }
      applyResult(result);
    });
  }

  return (
    <section className="rounded-xl border border-naranja/25 bg-naranja/5 p-4">
      <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
        Seguimiento
      </h3>

      {showPropiedadMetrics ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricPill label="Vistas web" value={engagement.visitasWeb} />
          <MetricPill label="Consultas" value={engagement.consultas} />
          <MetricPill label="Visitas fís. (lead)" value={visitasLead} accent />
          <MetricPill label="Visitas fís. (total)" value={visitasFisicasPropiedad} accent />
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/50">
          Índice de interés
        </p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-naranja-light">
          {engagement.indiceInteres}
        </p>
        <p className="text-[0.65rem] text-white/45">
          Vistas + consultas×2 + visitas físicas de la propiedad×3
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-naranja/40 bg-naranja/15 px-3 py-1.5 text-xs font-semibold text-naranja-light">
          Visitas presenciales (este lead): {visitasLead}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAjustar(1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-naranja px-3 py-2 text-xs font-semibold text-naranja transition hover:bg-naranja/10 disabled:opacity-50"
        >
          <Footprints className="h-3.5 w-3.5" aria-hidden />
          + Visita
        </button>
        <button
          type="button"
          disabled={isPending || visitasLead <= 0}
          onClick={() => handleAjustar(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-naranja/40 px-3 py-2 text-xs font-semibold text-naranja-light/90 transition hover:bg-naranja/10 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
          − Visita
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-naranja-light" role="alert">
          {error}
        </p>
      ) : null}

      <HistorialCollapsible
        open={historialOpen}
        onToggle={() => setHistorialOpen((v) => !v)}
        title={`Visitantes registrados — ${visitanteNombre}`}
        items={historialLead}
        emptyText="Todavía no hay visitas presenciales para este prospecto."
      />

      {showPropiedadMetrics ? (
        <HistorialCollapsible
          open={historialPropOpen}
          onToggle={() => setHistorialPropOpen((v) => !v)}
          title={`Todas las visitas físicas de la propiedad (${historialPropiedad.length})`}
          items={historialPropiedad}
          emptyText="Sin visitas en la propiedad."
          className="mt-2"
        />
      ) : null}
    </section>
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
      className={`rounded-lg border px-2 py-2 text-center ${
        accent ? 'border-naranja/35 bg-naranja/10' : 'border-white/10 bg-black/20'
      }`}
    >
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? 'text-naranja-light' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function HistorialCollapsible({
  open,
  onToggle,
  title,
  items,
  emptyText,
  className = '',
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  items: VisitaFisicaHistorialItem[];
  emptyText: string;
  className?: string;
}) {
  return (
    <div className={`mt-3 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-xs font-semibold text-white/85 transition hover:border-naranja/30"
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-naranja transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-2">
          {items.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-white/45">{emptyText}</li>
          ) : (
            items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{item.visitanteNombre}</span>
                  <span className="ml-1.5 text-white/45">
                    {item.delta > 0 ? '+1 visita' : '−1 visita'}
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
  );
}
