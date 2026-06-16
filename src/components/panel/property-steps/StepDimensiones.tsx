'use client';

import type { StepProps } from '@/types/panel';

import { HintEnter, StepHeading, SubtleInput } from './step-ui';

function CounterRow({
  label,
  value,
  onMinus,
  onPlus,
  disabled,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
        {label}
      </span>
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-2">
        <button
          type="button"
          onClick={onMinus}
          disabled={disabled}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 !text-white text-xl disabled:opacity-40"
        >
          -
        </button>
        <span className="w-8 text-center text-lg font-bold !text-white">{value}</span>
        <button
          type="button"
          onClick={onPlus}
          disabled={disabled}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 !text-white text-xl disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function StepDimensiones({ data, update, onNext, isEditMode }: StepProps) {
  const esLote = data.tipo === 'Lote';
  return (
    <>
      <StepHeading>
        {isEditMode
          ? 'Modificá las dimensiones y distribución'
          : esLote
            ? '¿Cuántos m² tiene el lote?'
            : '¿Qué dimensiones tiene?'}
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
      {!esLote ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <CounterRow
            label="Dormitorios"
            value={data.dormitorios}
            onMinus={() => update('dormitorios', Math.max(0, data.dormitorios - 1))}
            onPlus={() => update('dormitorios', data.dormitorios + 1)}
          />
          <CounterRow
            label="Baños"
            value={data.banos}
            onMinus={() => update('banos', Math.max(0, data.banos - 1))}
            onPlus={() => update('banos', data.banos + 1)}
          />
          <CounterRow
            label="Cocheras"
            value={data.cocheras}
            onMinus={() => update('cocheras', Math.max(0, data.cocheras - 1))}
            onPlus={() => update('cocheras', data.cocheras + 1)}
          />
        </div>
      ) : null}
      <HintEnter />
    </>
  );
}
