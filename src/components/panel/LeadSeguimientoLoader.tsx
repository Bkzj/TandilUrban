'use client';

import { useEffect, useState } from 'react';

import { getSeguimientoLead } from '@/actions/contacto';
import { buildPropiedadEngagement } from '@/lib/panel-seguimiento';
import type { VisitaFisicaHistorialItem } from '@/lib/panel-seguimiento';

import { SeguimientoVisitasPanel } from './SeguimientoVisitasPanel';

type Props = {
  contactoId: string;
  visitanteNombre: string;
  initialVisitasLead: number;
  visitasWeb: number;
  consultas: number;
  onVisitasLeadChange?: (visitasFisicas: number) => void;
};

export function LeadSeguimientoLoader({
  contactoId,
  visitanteNombre,
  initialVisitasLead,
  visitasWeb,
  consultas,
  onVisitasLeadChange,
}: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitasLead, setVisitasLead] = useState(initialVisitasLead);
  const [visitasFisicasPropiedad, setVisitasFisicasPropiedad] = useState(0);
  const [historialLead, setHistorialLead] = useState<VisitaFisicaHistorialItem[]>([]);
  const [historialPropiedad, setHistorialPropiedad] = useState<VisitaFisicaHistorialItem[]>([]);

  useEffect(() => {
    setVisitasLead(initialVisitasLead);
  }, [contactoId, initialVisitasLead]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    void (async () => {
      const result = await getSeguimientoLead(contactoId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setReady(true);
        return;
      }
      setVisitasLead(result.visitasFisicas);
      setVisitasFisicasPropiedad(result.visitasFisicasPropiedad);
      setHistorialLead(result.historialLead);
      setHistorialPropiedad(result.historialPropiedad);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [contactoId]);

  if (!ready) {
    return (
      <section className="mb-6 rounded-xl border border-naranja/25 bg-naranja/5 p-4">
        <p className="text-xs text-white/50">Cargando seguimiento…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-xl border border-naranja/25 bg-naranja/5 p-4">
        <p className="text-xs text-naranja-light" role="alert">
          {error}
        </p>
      </section>
    );
  }

  return (
    <div className="mb-6">
      <SeguimientoVisitasPanel
        key={contactoId}
        contactoId={contactoId}
        visitanteNombre={visitanteNombre}
        initialVisitasLead={visitasLead}
        initialEngagement={buildPropiedadEngagement(
          visitasWeb,
          consultas,
          visitasLead,
          visitasFisicasPropiedad,
        )}
        initialHistorialLead={historialLead}
        initialVisitasFisicasPropiedad={visitasFisicasPropiedad}
        initialHistorialPropiedad={historialPropiedad}
        onVisitasLeadChange={onVisitasLeadChange}
      />
    </div>
  );
}
