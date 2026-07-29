'use client';

import type { StepProps, TipoInmueble } from '@/types/panel';

import { TIPOS_INMUEBLE } from './constants';
import { ChoiceStep, type ChoiceOption } from './ChoiceStep';

export function StepTipo({ data, update, onNext, isEditMode }: StepProps) {
  const options: readonly ChoiceOption<TipoInmueble>[] = TIPOS_INMUEBLE.map((tipo) => ({
    id: tipo,
    label: tipo,
  }));

  return (
    <ChoiceStep
      title={
        isEditMode
          ? 'Corregí el tipo de operación o inmueble'
          : '¿Qué tipo de inmueble es?'
      }
      options={options}
      value={data.tipo}
      onChange={(value) => update('tipo', value)}
      onSelectionComplete={onNext}
      columnsClassName="gap-3 sm:grid-cols-3"
      compact
    />
  );
}
