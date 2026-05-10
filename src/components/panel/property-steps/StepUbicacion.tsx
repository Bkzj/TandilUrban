'use client';

import type { StepProps } from '@/types/panel';

import { HintEnter, StepHeading, SubtleInput } from './step-ui';

export function StepUbicacion({ data, update, onNext }: StepProps) {
  return (
    <>
      <StepHeading>¿Dónde está ubicada?</StepHeading>
      <div className="grid gap-6 sm:grid-cols-2">
        <SubtleInput
          label="Dirección"
          placeholder="Av. Avellaneda 1234"
          value={data.direccion}
          onChange={(v) => update('direccion', v)}
          onEnter={onNext}
          autoFocus
        />
        <SubtleInput
          label="Barrio"
          placeholder="Centro, Movediza, Sierra del Tigre…"
          value={data.barrio}
          onChange={(v) => update('barrio', v)}
          onEnter={onNext}
        />
      </div>
      <HintEnter />
    </>
  );
}
