import { z } from 'zod';

import { REQUEST_LIMITS } from '@/lib/validation/limits';

const FORBIDDEN_SINGLE_LINE_CONTROLS = /[\u0000-\u001f\u007f]/u;
const FORBIDDEN_MULTILINE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export function normalizeSingleLine(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function normalizeMultiline(value: string): string {
  return value.normalize('NFKC').trim().replace(/\r\n?/gu, '\n');
}

export const identifierSchema = z
  .string()
  .transform(normalizeSingleLine)
  .pipe(z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/u, 'Identificador inválido.'));

export const optionalIdentifierSchema = z
  .string()
  .transform(normalizeSingleLine)
  .pipe(z.string().max(64).regex(/^[A-Za-z0-9_-]*$/u, 'Identificador inválido.'))
  .optional();

export const normalizedNameSchema = z
  .string()
  .transform(normalizeSingleLine)
  .pipe(
    z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(REQUEST_LIMITS.nameChars, 'El nombre es demasiado largo.')
      .refine((value) => !FORBIDDEN_SINGLE_LINE_CONTROLS.test(value), 'El nombre contiene caracteres inválidos.'),
  );

export const normalizedEmailSchema = z
  .string()
  .transform((value) => normalizeSingleLine(value).toLowerCase())
  .pipe(
    z
      .string()
      .max(REQUEST_LIMITS.emailChars, 'El email es demasiado largo.')
      .email('El email no tiene un formato válido.'),
  );

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(REQUEST_LIMITS.passwordChars, 'La contraseña es demasiado larga.');

export const phoneSchema = z
  .string()
  .transform(normalizeSingleLine)
  .pipe(
    z
      .string()
      .min(6, 'El teléfono debe tener al menos 6 caracteres.')
      .max(REQUEST_LIMITS.phoneChars, 'El teléfono es demasiado largo.')
      .regex(/^\+?[0-9 ()\-./]+$/u, 'El teléfono contiene caracteres inválidos.')
      .refine((value) => {
        const digits = value.replace(/\D/gu, '');
        return digits.length >= 6 && digits.length <= 15;
      }, 'El teléfono debe contener entre 6 y 15 dígitos.'),
  );

export const optionalPhoneSchema = z
  .union([phoneSchema, z.literal('').transform(() => null), z.null(), z.undefined()])
  .transform((value) => value ?? null);

export function boundedSingleLine(min: number, max: number, message: string) {
  return z
    .string()
    .transform(normalizeSingleLine)
    .pipe(
      z
        .string()
        .min(min, message)
        .max(max, 'El texto es demasiado largo.')
        .refine((value) => !FORBIDDEN_SINGLE_LINE_CONTROLS.test(value), 'El texto contiene caracteres inválidos.'),
    );
}

export function boundedMultiline(min: number, max: number, message: string) {
  return z
    .string()
    .transform(normalizeMultiline)
    .pipe(
      z
        .string()
        .min(min, message)
        .max(max, 'El texto es demasiado largo.')
        .refine((value) => !FORBIDDEN_MULTILINE_CONTROLS.test(value), 'El texto contiene caracteres inválidos.'),
    );
}

export const idempotencyKeySchema = z
  .string()
  .transform(normalizeSingleLine)
  .pipe(
    z
      .string()
      .min(16, 'La clave de idempotencia es inválida.')
      .max(REQUEST_LIMITS.idempotencyKeyChars, 'La clave de idempotencia es inválida.')
      .regex(/^[A-Za-z0-9_-]+$/u, 'La clave de idempotencia es inválida.'),
  );

export const finiteNumberSchema = z
  .union([
    z.number(),
    z.string().trim().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u, 'Número inválido.'),
  ])
  .transform((value, context) => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) {
      context.addIssue({ code: 'custom', message: 'El número debe ser finito.' });
      return z.NEVER;
    }
    return number;
  });

export const latitudeSchema = finiteNumberSchema.pipe(
  z.number().min(-90, 'Latitud fuera de rango.').max(90, 'Latitud fuera de rango.'),
);
export const longitudeSchema = finiteNumberSchema.pipe(
  z.number().min(-180, 'Longitud fuera de rango.').max(180, 'Longitud fuera de rango.'),
);
