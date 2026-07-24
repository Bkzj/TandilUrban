'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { EstadoPropiedad } from '@prisma/client';

import { cambiarEstadoPropiedad } from '@/actions/propiedades';
import type { PanelPropiedadEstado } from '@/types/panel';

const ESTADOS: PanelPropiedadEstado[] = ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'PAUSADA'];

const LABELS: Record<PanelPropiedadEstado, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADA: 'Reservada',
  VENDIDA: 'Vendida',
  PAUSADA: 'Pausada',
};

const STYLES: Record<PanelPropiedadEstado, string> = {
  DISPONIBLE: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  RESERVADA: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
  VENDIDA: 'text-red-400/90 bg-red-400/10 border-red-400/20',
  PAUSADA: 'text-white/50 bg-white/5 border-white/15',
};

type Props = {
  propiedadId: string;
  estadoActual: PanelPropiedadEstado;
  onEstadoChange?: (estado: PanelPropiedadEstado) => void;
  className?: string;
};

export function EstadoSelector({
  propiedadId,
  estadoActual,
  onEstadoChange,
  className = '',
}: Props) {
  const [estado, setEstado] = useState(estadoActual);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as PanelPropiedadEstado;
    if (next === estado) return;

    setError(null);
    const prev = estado;
    setEstado(next);

    startTransition(async () => {
      const result = await cambiarEstadoPropiedad(propiedadId, next as EstadoPropiedad);
      if (!result.ok) {
        setEstado(prev);
        setError(result.error);
        return;
      }
      onEstadoChange?.(result.estado as PanelPropiedadEstado);
    });
  }

  const style = STYLES[estado];

  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        value={estado}
        disabled={isPending}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Estado de la propiedad"
        className={`appearance-none rounded-full border py-1.5 pl-3 pr-8 text-xs font-semibold uppercase tracking-wide transition-opacity focus:outline-none focus:ring-2 focus:ring-naranja/40 disabled:cursor-wait ${style} ${
          isPending ? 'opacity-60' : 'cursor-pointer hover:brightness-110'
        }`}
      >
        {ESTADOS.map((opt) => (
          <option key={opt} value={opt} className="bg-neutral-900 text-white">
            {LABELS[opt]}
          </option>
        ))}
      </select>
      {isPending ? (
        <Loader2
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-white/70"
          aria-hidden
        />
      ) : (
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.6rem] text-current opacity-60"
          aria-hidden
        >
          ▾
        </span>
      )}
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
