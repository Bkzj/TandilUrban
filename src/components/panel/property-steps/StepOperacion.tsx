'use client';

import type { Operacion, StepProps } from '@/types/panel';

import { BigChoice, StepHeading } from './step-ui';

export function StepOperacion({ data, update, onNext, isEditMode }: StepProps) {
  const opts: { id: Operacion; label: string; sub: string }[] = [
    { id: 'VENTA', label: 'Venta', sub: 'Quiero vender una propiedad' },
    { id: 'ALQUILER', label: 'Alquiler', sub: 'Quiero alquilar una propiedad' },
  ];
  return (
    <>
      <StepHeading>
        {isEditMode ? 'Corregí el tipo de operación' : '¿Qué tipo de operación querés publicar?'}
      </StepHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {opts.map((opt) => (
          <BigChoice
            key={opt.id}
            active={data.operacion === opt.id}
            label={opt.label}
            sub={opt.sub}
            onClick={() => {
              update('operacion', opt.id);
              window.setTimeout(onNext, 220);
            }}
          />
        ))}
      </div>
    </>
  );
}
