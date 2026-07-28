import 'server-only';

import { type EstadoPropiedad, type Prisma } from '@prisma/client';
import {
  isPublicPropertyState,
  PUBLIC_PROPERTY_STATES,
} from '@/lib/public-property-state';

export { isPublicPropertyState, PUBLIC_PROPERTY_STATES };

export const PUBLIC_PROPERTY_WHERE = {
  estado: { in: [...PUBLIC_PROPERTY_STATES] },
} satisfies Prisma.PropiedadWhereInput;

export class PublicPropertyNotFoundError extends Error {
  constructor() {
    super('Propiedad no encontrada.');
    this.name = 'PublicPropertyNotFoundError';
  }
}

export function requirePublicProperty<T extends { estado: EstadoPropiedad }>(
  propiedad: T | null,
): T {
  if (!propiedad || !isPublicPropertyState(propiedad.estado)) {
    throw new PublicPropertyNotFoundError();
  }
  return propiedad;
}
