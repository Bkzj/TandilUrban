'use client';

import type { StepProps } from '@/types/panel';

import { HintEnter, StepHeading, SubtleInput } from './step-ui';

export function StepPrecio({ data, update, onNext }: StepProps) {
  return (
    <>
      <StepHeading>¿Cuál es el precio de publicación?</StepHeading>
      <div className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-surface/20 bg-surface/5">
            {(['USD', 'ARS'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update('moneda', m)}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                  data.moneda === m ? 'bg-naranja text-surface' : 'text-surface/70 hover:bg-surface/5'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <SubtleInput
              label="Precio"
              type="number"
              inputMode="decimal"
              placeholder="180000"
              value={data.precio}
              onChange={(v) => update('precio', v)}
              onEnter={onNext}
              autoFocus
            />
          </div>
        </div>
        <div className="max-w-sm">
          <SubtleInput
            label="Expensas (opcional)"
            type="number"
            inputMode="decimal"
            placeholder="25000"
            value={data.expensas}
            onChange={(v) => update('expensas', v)}
            onEnter={onNext}
          />
        </div>
      </div>
      <HintEnter />
    </>
  );
}
