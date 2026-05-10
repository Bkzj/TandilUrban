'use client';

import type { StepProps, TipoInmueble } from '@/types/panel';

import { TIPOS_INMUEBLE } from './constants';
import { BigChoice, StepHeading } from './step-ui';

export function StepTipo({ data, update, onNext }: StepProps) {
  return (
    <>
      <StepHeading>¿Qué tipo de inmueble es?</StepHeading>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIPOS_INMUEBLE.map((tipo: TipoInmueble) => (
          <BigChoice
            key={tipo}
            active={data.tipo === tipo}
            label={tipo}
            onClick={() => {
              update('tipo', tipo);
              window.setTimeout(onNext, 220);
            }}
            compact
          />
        ))}
      </div>
    </>
  );
}
