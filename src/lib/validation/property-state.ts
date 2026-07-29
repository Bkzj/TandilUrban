import { EstadoPropiedad } from '@prisma/client';
import { z } from 'zod';

export const propertyStateSchema = z.enum(EstadoPropiedad);

const ALLOWED_TRANSITIONS: Readonly<Record<EstadoPropiedad, readonly EstadoPropiedad[]>> = {
  DISPONIBLE: [EstadoPropiedad.DISPONIBLE, EstadoPropiedad.RESERVADA, EstadoPropiedad.PAUSADA, EstadoPropiedad.VENDIDA],
  RESERVADA: [EstadoPropiedad.RESERVADA, EstadoPropiedad.DISPONIBLE, EstadoPropiedad.PAUSADA, EstadoPropiedad.VENDIDA],
  PAUSADA: [EstadoPropiedad.PAUSADA, EstadoPropiedad.DISPONIBLE],
  VENDIDA: [EstadoPropiedad.VENDIDA],
};

export function canTransitionPropertyState(from: EstadoPropiedad, to: EstadoPropiedad): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const propertyStateUpdateSchema = z
  .object({
    estado: propertyStateSchema,
  })
  .strict();
