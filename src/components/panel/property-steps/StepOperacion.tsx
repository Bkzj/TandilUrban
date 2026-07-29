'use client';

import type { Operacion, StepProps } from '@/types/panel';

import { ChoiceStep, type ChoiceOption } from './ChoiceStep';

export function StepOperacion({ data, update, onNext, isEditMode }: StepProps) {
  const options: readonly ChoiceOption<Operacion>[] = [
    { id: 'VENTA', label: 'Venta', description: 'Quiero vender una propiedad' },
    { id: 'ALQUILER', label: 'Alquiler', description: 'Quiero alquilar una propiedad' },
  ];
  return (
    <ChoiceStep
      title={isEditMode ? 'Corregí el tipo de operación' : '¿Qué tipo de operación querés publicar?'}
      options={options}
      value={data.operacion}
      onChange={(value) => update('operacion', value)}
      onSelectionComplete={onNext}
      columnsClassName="gap-4 sm:grid-cols-2"
    />
  );
}
