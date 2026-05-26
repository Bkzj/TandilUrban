'use client';

import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, X } from 'lucide-react';

import type { PanelLeadEstado, PanelLeadRow } from '@/types/panel';

import { LeadSeguimientoLoader } from './LeadSeguimientoLoader';

type Props = {
  lead: PanelLeadRow;
  onClose: () => void;
  onLeadUpdated: (id: string, estado: PanelLeadEstado) => void;
  onVisitasUpdated: (id: string, visitasFisicas: number) => void;
};

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LeadQuickView({ lead, onClose, onLeadUpdated, onVisitasUpdated }: Props) {
  const readAttempted = useRef(false);
  const [markingResponded, setMarkingResponded] = useState(false);

  useEffect(() => {
    readAttempted.current = false;
  }, [lead.id]);

  useEffect(() => {
    if (lead.estado !== 'NUEVO' || readAttempted.current) return;
    readAttempted.current = true;

    void (async () => {
      try {
        const res = await fetch(`/api/panel/mensajes/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'LEIDO' }),
        });
        if (res.ok) {
          onLeadUpdated(lead.id, 'LEIDO');
        }
      } catch {
        readAttempted.current = false;
      }
    })();
  }, [lead.id, lead.estado, onLeadUpdated]);

  async function markRespondido() {
    setMarkingResponded(true);
    try {
      const res = await fetch(`/api/panel/mensajes/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'RESPONDIDO' }),
      });
      if (res.ok) {
        onLeadUpdated(lead.id, 'RESPONDIDO');
      }
    } finally {
      setMarkingResponded(false);
    }
  }

  const tel = lead.telefono?.trim() ? lead.telefono.replace(/\s+/g, '') : '';
  const mailHref = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(`Consulta · ${lead.propiedad.titulo}`)}`;

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-quick-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <aside
        className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-gradient-to-b from-text-primary/95 via-verde-dark/95 to-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div>
            <p id="lead-quick-title" className="text-lg font-semibold text-white">
              Consulta recibida
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-white/50">{fmtDate(lead.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <section className="mb-6">
            <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
              Prospecto
            </h3>
            <p className="mt-2 text-base font-semibold text-white">{lead.nombre}</p>
            <p className="text-sm text-white/75">{lead.email}</p>
            {lead.telefono ? (
              <p className="text-sm text-white/75">{lead.telefono}</p>
            ) : (
              <p className="text-xs italic text-white/40">Sin teléfono</p>
            )}
          </section>

          <section className="mb-6">
            <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
              Propiedad
            </h3>
            <p className="mt-2 text-sm font-medium leading-snug text-white">{lead.propiedad.titulo}</p>
          </section>

          <LeadSeguimientoLoader
            contactoId={lead.id}
            visitanteNombre={lead.nombre}
            initialVisitasLead={lead.visitasFisicas ?? 0}
            visitasWeb={lead.propiedad.visitas ?? 0}
            consultas={lead.propiedad.consultas ?? 0}
            onVisitasLeadChange={(n) => onVisitasUpdated(lead.id, n)}
          />

          <section>
            <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-naranja-light/90">
              Mensaje
            </h3>
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white/90">
              {lead.mensaje}
            </div>
          </section>
        </div>

        <div className="border-t border-white/10 p-5 md:p-6">
          <div className="flex flex-wrap gap-2">
            {tel ? (
              <a
                href={`tel:${tel}`}
                className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-2 rounded-xl border border-naranja/50 bg-naranja/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-naranja/30"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Llamar
              </a>
            ) : (
              <span className="inline-flex flex-1 min-w-[7rem] cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/35 opacity-70">
                <Phone className="h-4 w-4" aria-hidden />
                Llamar
              </span>
            )}
            <a
              href={mailHref}
              className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-2 rounded-xl border border-naranja/40 bg-naranja/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-naranja/25"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Enviar email
            </a>
          </div>
          <button
            type="button"
            disabled={markingResponded || lead.estado === 'RESPONDIDO'}
            onClick={() => void markRespondido()}
            className="mt-3 w-full rounded-xl bg-naranja px-4 py-3 text-sm font-semibold text-surface shadow-md shadow-naranja/25 transition hover:bg-naranja-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lead.estado === 'RESPONDIDO' ? 'Marcado como respondido' : markingResponded ? 'Guardando…' : 'Marcar como respondido'}
          </button>
        </div>
      </aside>
    </div>
  );
}
