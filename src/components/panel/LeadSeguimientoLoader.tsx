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
  const [loadedContactoId, setLoadedContactoId] = useState<string | null>(null);
  const ready = loadedContactoId === contactoId;
  const [error, setError] = useState<string | null>(null);
  const [visitasLead, setVisitasLead] = useState(initialVisitasLead);
  const [visitasFisicasPropiedad, setVisitasFisicasPropiedad] = useState(0);
  const [historialLead, setHistorialLead] = useState<VisitaFisicaHistorialItem[]>([]);
  const [historialPropiedad, setHistorialPropiedad] = useState<VisitaFisicaHistorialItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getSeguimientoLead(contactoId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setLoadedContactoId(contactoId);
        return;
      }
      setVisitasLead(result.visitasFisicas);
      setVisitasFisicasPropiedad(result.visitasFisicasPropiedad);
      setHistorialLead(result.historialLead);
      setHistorialPropiedad(result.historialPropiedad);
      setLoadedContactoId(contactoId);
    })();

    return () => {
      cancelled = true;
    };
  }, [contactoId]);

  if (!ready) {
    return (
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <p className="text-xs text-white/50">Cargando seguimiento…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
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
