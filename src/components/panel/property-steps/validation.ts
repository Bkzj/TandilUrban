import type { PropertyFormData } from '@/types/panel';

import type { StepKey } from './constants';

export function isStepValid(step: StepKey, data: PropertyFormData): boolean {
  switch (step) {
    case 'operacion':
      return Boolean(data.operacion);
    case 'tipo':
      return Boolean(data.tipo);
    case 'ubicacion':
      return data.direccion.trim().length > 2;
    case 'dimensiones': {
      if (data.tipo === 'Lote') return Number(data.m2Total) > 0;
      return (
        Number(data.m2Total) > 0 &&
        Number(data.m2Cubiertos) > 0 &&
        Number(data.ambientes) > 0
      );
    }
    case 'precio':
      return Number(data.precio) > 0;
    case 'caracteristicas':
      return true;
    case 'imagenes':
      return true;
    case 'textos':
      return data.titulo.trim().length > 3 && data.descripcion.trim().length > 10;
    default:
      return true;
  }
}
