import { EstadoContacto } from '@prisma/client';
import { z } from 'zod';

import {
  boundedMultiline,
  idempotencyKeySchema,
  identifierSchema,
  normalizedEmailSchema,
  normalizedNameSchema,
  optionalPhoneSchema,
  phoneSchema,
} from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';

export const publicContactSchema = z
  .object({
    nombre: normalizedNameSchema.pipe(z.string().min(3, 'El nombre debe tener al menos 3 caracteres.')),
    email: normalizedEmailSchema,
    telefono: phoneSchema,
    mensaje: boundedMultiline(
      10,
      REQUEST_LIMITS.contactMessageChars,
      'El mensaje debe tener al menos 10 caracteres.',
    ),
    propiedadId: identifierSchema,
  })
  .strict();
export type PublicContactInput = z.infer<typeof publicContactSchema>;

export const contactStatusSchema = z
  .object({
    estado: z.enum(EstadoContacto),
  })
  .strict();

export const manualPhysicalVisitSchema = z
  .object({
    propiedadId: identifierSchema,
    nombre: normalizedNameSchema,
    email: z.union([normalizedEmailSchema, z.literal('').transform(() => null), z.null(), z.undefined()]).transform(
      (value) => value ?? null,
    ),
    telefono: optionalPhoneSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine((value) => value.email !== null || value.telefono !== null, {
    message: 'Ingresá un teléfono o un email.',
    path: ['email'],
  });

export type ManualPhysicalVisitInput = z.infer<typeof manualPhysicalVisitSchema>;

export const physicalVisitAdjustmentSchema = z
  .object({
    contactoId: identifierSchema,
    delta: z.union([z.literal(1), z.literal(-1)]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const physicalVisitDeleteSchema = z
  .object({
    eventoId: identifierSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
