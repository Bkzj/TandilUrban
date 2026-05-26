'use client';

import { useCallback, useState } from 'react';

import type { PanelLeadEstado, PanelLeadRow } from '@/types/panel';

import { LeadQuickView } from './LeadQuickView';

type Props = {
  leads: PanelLeadRow[];
};

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" viewBox="0 0 80 56"><rect fill="#1a1a1a" width="80" height="56"/><text x="40" y="30" fill="#555" text-anchor="middle" font-family="sans-serif" font-size="9">Sin foto</text></svg>`
  );

function fmtShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function EstadoBadge({ estado }: { estado: PanelLeadEstado }) {
  if (estado === 'NUEVO') {
    return (
      <span className="inline-flex items-center rounded-full bg-naranja px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-surface shadow-sm shadow-naranja/40">
        Nuevo
      </span>
    );
  }
  if (estado === 'LEIDO') {
    return (
      <span className="inline-flex items-center rounded-full border border-white/25 bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/65">
        Leído
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-verde/40 bg-verde/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
      Respondido
    </span>
  );
}

export function LeadsTable({ leads: initialLeads }: Props) {
  const leadsKey = initialLeads.map((l) => l.id).join('\0');
  const [leads, setLeads] = useState(initialLeads);
  const [openId, setOpenId] = useState<string | null>(null);
  const [syncedLeadsKey, setSyncedLeadsKey] = useState(leadsKey);

  if (syncedLeadsKey !== leadsKey) {
    setSyncedLeadsKey(leadsKey);
    setLeads(initialLeads);
  }

  const openLead = leads.find((l) => l.id === openId) ?? null;

  const onLeadUpdated = useCallback((id: string, estado: PanelLeadEstado) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
  }, []);

  const onLeadVisitasUpdated = useCallback((id: string, visitasFisicas: number) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, visitasFisicas } : l)));
  }, []);

  if (initialLeads.length === 0 && leads.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-10 text-center backdrop-blur-md">
        <p className="text-white/80">No hay consultas por ahora.</p>
        <p className="mt-2 text-sm text-white/50">
          Cuando ingresen leads desde el sitio público, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm text-white">
            <thead>
              <tr className="border-b border-white/10 bg-black/30">
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                  Fecha
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                  Propiedad
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                  Contacto
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenId(lead.id);
                    }
                  }}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                >
                  <td className="whitespace-nowrap px-4 py-3 align-middle text-white/80">{fmtShort(lead.createdAt)}</td>
                  <td className="max-w-[280px] px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={lead.propiedad.imagenes[0]?.url || PLACEHOLDER}
                          alt=""
                          className="h-full w-full object-cover"
                          width={64}
                          height={48}
                        />
                      </div>
                      <span className="line-clamp-2 font-medium leading-snug text-white">{lead.propiedad.titulo}</span>
                    </div>
                  </td>
                  <td className="max-w-[240px] px-4 py-3 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-white">{lead.nombre}</span>
                      <span className="truncate text-xs text-white/60">{lead.email}</span>
                      {lead.telefono ? (
                        <span className="text-xs text-white/55">{lead.telefono}</span>
                      ) : (
                        <span className="text-xs italic text-white/35">—</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <EstadoBadge estado={lead.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openLead ? (
        <LeadQuickView
          lead={openLead}
          onClose={() => setOpenId(null)}
          onLeadUpdated={onLeadUpdated}
          onVisitasUpdated={onLeadVisitasUpdated}
        />
      ) : null}
    </>
  );
}
