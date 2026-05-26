'use client';

import type { StepProps } from '@/types/panel';

import { CARACTERISTICAS } from './constants';
import { StepHeading } from './step-ui';

export function StepCaracteristicas({
  data,
  update,
  isEditMode,
}: Omit<StepProps, 'onNext'>) {
  return (
    <>
      <StepHeading>
        {isEditMode ? 'Actualizá las comodidades y extras' : '¿Qué comodidades tiene?'}
      </StepHeading>
      <div className="flex flex-wrap gap-2">
        {CARACTERISTICAS.map((item) => {
          const active = data.caracteristicas.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() =>
                update(
                  'caracteristicas',
                  data.caracteristicas.includes(item)
                    ? data.caracteristicas.filter((c) => c !== item)
                    : [...data.caracteristicas, item]
                )
              }
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? 'border-naranja bg-naranja text-surface shadow shadow-naranja/30'
                  : 'border-surface/20 bg-transparent text-surface/80 hover:border-surface/40 hover:bg-surface/5'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-surface/45">
        {data.caracteristicas.length} seleccionadas · podés saltar este paso si querés.
      </p>
    </>
  );
}
