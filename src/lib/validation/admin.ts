import { z } from 'zod';

import { boundedSingleLine, identifierSchema, normalizedEmailSchema, normalizedNameSchema, passwordSchema } from '@/lib/validation/common';

const cuitSchema = boundedSingleLine(8, 24, 'Ingresá un CUIT válido.');
const addressSchema = boundedSingleLine(3, 180, 'Ingresá una dirección válida.');

export const createInmobiliariaSchema = z.object({
  nombreAgencia: boundedSingleLine(2, 120, 'Ingresá el nombre de la inmobiliaria.'),
  cuit: cuitSchema,
  direccion: addressSchema,
  administrador: z.object({
    nombre: normalizedNameSchema,
    email: normalizedEmailSchema,
  }).strict(),
}).strict();

export const inviteAgentSchema = z.object({
  nombre: normalizedNameSchema,
  email: normalizedEmailSchema,
  inmobiliariaId: identifierSchema.optional(),
}).strict();

export const accountStatusSchema = z.object({
  userId: identifierSchema,
  activo: z.boolean(),
}).strict();

export const acceptAccountInvitationSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/u, 'La invitación no es válida o venció.'),
  password: passwordSchema,
  passwordConfirmation: passwordSchema,
}).strict().superRefine((value, context) => {
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'Las contraseñas no coinciden.' });
  }
});
