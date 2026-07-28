import { Moneda, Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  finiteNumberSchema,
  latitudeSchema,
  longitudeSchema,
  normalizeSingleLine,
} from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { validateMoneyText } from '@/lib/money';

const positiveIntegerParameter = z
  .string()
  .regex(/^[1-9]\d*$/u, 'Debe ser un entero positivo.')
  .transform(Number);

export const paginationSchema = z
  .object({
    page: positiveIntegerParameter.default(1),
    pageSize: positiveIntegerParameter
      .pipe(z.number().max(REQUEST_LIMITS.paginationSize, `Máximo ${REQUEST_LIMITS.paginationSize} resultados.`))
      .default(20),
  })
  .strict();

export const propertySortFieldSchema = z.enum(['createdAt', 'precio', 'm2Total']);
export const sortDirectionSchema = z.enum(['asc', 'desc']);

const optionalMoneyFilter = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) return undefined;
    const parsed = validateMoneyText(value, { allowZero: true });
    if (!parsed.ok) {
      context.addIssue({ code: 'custom', message: 'El filtro de precio es inválido.' });
      return z.NEVER;
    }
    return parsed.value;
  });

export const searchPropertiesSchema = z
  .object({
    query: z
      .string()
      .transform(normalizeSingleLine)
      .pipe(z.string().max(REQUEST_LIMITS.searchChars, 'La búsqueda es demasiado larga.'))
      .default(''),
    operacion: z
      .string()
      .transform((value) => value.trim().toUpperCase())
      .pipe(z.enum(['VENTA', 'ALQUILER']))
      .optional(),
    tipo: z
      .string()
      .transform((value) => {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'depto') return 'Departamento';
        return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
      })
      .pipe(z.enum(['Casa', 'Departamento', 'Lote', 'Local', 'Oficina']))
      .optional(),
    moneda: z.enum(Moneda).optional(),
    minPrecio: optionalMoneyFilter,
    maxPrecio: optionalMoneyFilter,
    sort: propertySortFieldSchema.default('createdAt'),
    direction: sortDirectionSchema.default('desc'),
  })
  .strip()
  .refine(
    (value) =>
      value.minPrecio === undefined ||
      value.maxPrecio === undefined ||
      new Prisma.Decimal(value.minPrecio).lessThanOrEqualTo(new Prisma.Decimal(value.maxPrecio)),
    { message: 'El precio mínimo no puede superar al máximo.', path: ['minPrecio'] },
  );

export const nearbySearchSchema = z
  .object({
    lat: latitudeSchema,
    lng: longitudeSchema,
    radio: finiteNumberSchema.pipe(z.number().positive().max(20_000)).default(1_000),
  })
  .strict();
