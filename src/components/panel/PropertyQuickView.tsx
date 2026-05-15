'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import type { PanelPropiedadTableRow } from '@/types/panel';

import { DeletePropertyButton } from './DeletePropertyButton';

type Props = {
  propiedad: PanelPropiedadTableRow;
  onClose: () => void;
};

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect fill="#141414" width="400" height="240"/><text x="200" y="120" fill="#666" text-anchor="middle" font-family="sans-serif" font-size="14">Sin imagen</text></svg>`
  );

function msPerDay(): number {
  return 1000 * 60 * 60 * 24;
}

function diasEnMercado(createdIso: string): number {
  const start = new Date(createdIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / msPerDay()));
}

function convRatePct(visitas: number, consultas: number): number {
  if (visitas <= 0) return 0;
  return (consultas / visitas) * 100;
}

function termometro(visitas: number, consultas: number): { label: string; className: string } {
  const conv = convRatePct(visitas, consultas);
  if (conv > 5) {
    return {
      label: 'Alta Demanda',
      className: 'border border-verde bg-verde text-white shadow-sm',
    };
  }
  if (visitas > 100 && consultas === 0) {
    return {
      label: 'Revisar Precio/Fotos',
      className: 'border border-black/10 bg-black/20 text-white',
    };
  }
  return { label: 'Normal', className: 'border border-black/10 bg-black/20 text-white' };
}

export function PropertyQuickView({ propiedad, onClose }: Props) {
  const thumb = propiedad.imagenes[0]?.trim() || PLACEHOLDER;
  const visitas = propiedad.visitas ?? 0;
  const consultas = propiedad.consultas ?? 0;
  const dias = diasEnMercado(propiedad.createdAt);
  const conv = convRatePct(visitas, consultas);
  const term = termometro(visitas, consultas);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar vista rápida"
        className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 z-[150] flex h-screen w-full max-w-lg flex-col overflow-y-auto bg-naranja text-white shadow-2xl"
        data-lenis-prevent="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 p-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">
            Vista rápida
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-black/15 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-black/10">
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="p-5">
          <h2 id="quick-view-title" className="text-2xl font-semibold leading-tight text-white">
            {propiedad.titulo}
          </h2>
          <p className="mt-2 text-sm uppercase tracking-wide text-white/80">
            {propiedad.operacion} · {propiedad.tipo}
          </p>
          <p className="mt-3 text-xl font-semibold tabular-nums text-white">
            {propiedad.moneda} {propiedad.precio.toLocaleString('es-AR')}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-black/10 bg-black/20 p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">Visitas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{visitas}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-black/20 p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">Consultas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{consultas}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-black/20 p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">Días activa</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{dias}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-black/20 p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">Conv. rate</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{conv.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-white/70">
              Termómetro de interés
            </p>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${term.className}`}
            >
              {term.label}
            </span>
          </div>
        </div>

        <footer className="mt-auto shrink-0 border-t border-black/10 p-4">
          <div className="flex flex-col gap-3">
            <Link
              href={`/panel/propiedades/editar/${propiedad.id}`}
              className="flex w-full items-center justify-center rounded-xl bg-verde py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-verde/80"
            >
              Editar propiedad
            </Link>
            <DeletePropertyButton
              propiedadId={propiedad.id}
              variant="full"
              onSuccess={onClose}
            />
          </div>
        </footer>
      </div>
    </>
  );
}
