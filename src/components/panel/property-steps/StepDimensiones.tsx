'use client';

import type { StepProps } from '@/types/panel';

import { HintEnter, StepHeading, SubtleInput } from './step-ui';

export function StepDimensiones({ data, update, onNext }: StepProps) {
  const esLote = data.tipo === 'Lote';
  return (
    <>
      <StepHeading>
        {esLote ? '¿Cuántos m² tiene el lote?' : '¿Cuáles son las dimensiones?'}
      </StepHeading>
      <div className={`grid gap-6 ${esLote ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
        <SubtleInput
          label="Superficie total (m²)"
          type="number"
          inputMode="numeric"
          placeholder="120"
          value={data.m2Total}
          onChange={(v) => update('m2Total', v)}
          onEnter={onNext}
          autoFocus
        />
        {!esLote && (
          <>
            <SubtleInput
              label="Superficie cubierta (m²)"
              type="number"
              inputMode="numeric"
              placeholder="85"
              value={data.m2Cubiertos}
              onChange={(v) => update('m2Cubiertos', v)}
              onEnter={onNext}
            />
            <SubtleInput
              label="Ambientes"
              type="number"
              inputMode="numeric"
              placeholder="3"
              value={data.ambientes}
              onChange={(v) => update('ambientes', v)}
              onEnter={onNext}
            />
          </>
        )}
      </div>
      <HintEnter />
    </>
  );
}
