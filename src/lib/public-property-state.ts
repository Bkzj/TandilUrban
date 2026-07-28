import { EstadoPropiedad } from '@prisma/client';

export const PUBLIC_PROPERTY_STATES = [
  EstadoPropiedad.DISPONIBLE,
  EstadoPropiedad.RESERVADA,
] as const;

export function isPublicPropertyState(
  estado: EstadoPropiedad,
): estado is (typeof PUBLIC_PROPERTY_STATES)[number] {
  return PUBLIC_PROPERTY_STATES.includes(estado as (typeof PUBLIC_PROPERTY_STATES)[number]);
}
