'use client';

import type { StepProps } from '@/types/panel';

import { StepHeading, SubtleInput } from './step-ui';

export function StepTextos({ data, update, onNext: _onNext }: StepProps) {
  return (
    <>
      <StepHeading>Contale al comprador qué hace única a esta propiedad</StepHeading>
      <div className="space-y-6">
        <SubtleInput
          label="Título"
          placeholder="Casa luminosa con parque y vista a las sierras"
          value={data.titulo}
          onChange={(v) => update('titulo', v)}
          autoFocus
        />
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
            Descripción
          </span>
          <textarea
            value={data.descripcion}
            onChange={(e) => update('descripcion', e.target.value)}
            rows={5}
            placeholder="3 dormitorios, 2 baños, parque con asador, ubicado a 5 minutos del centro…"
            className="w-full resize-none border-0 border-b-[3px] border-surface/40 bg-transparent px-0 pb-3 pt-2 text-lg font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55"
          />
          <button
            type="button"
            onClick={() => undefined}
            className="self-start rounded-full border border-surface/25 bg-surface/5 px-4 py-1.5 text-xs font-medium text-surface/85 transition hover:border-naranja hover:bg-naranja/15 hover:text-surface"
          >
            ✨ Redactar con IA
          </button>
        </div>
      </div>
    </>
  );
}
