import { Moneda } from '@prisma/client';
import { z } from 'zod';

import { validateMoneyText } from '@/lib/money';
import {
  boundedMultiline,
  boundedSingleLine,
  finiteNumberSchema,
  identifierSchema,
  latitudeSchema,
  longitudeSchema,
  normalizeSingleLine,
} from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { propertyMediaUrlSchema } from '@/lib/validation/url';

const propertyTypeSchema = z.enum(['Casa', 'Departamento', 'Lote', 'Local', 'Oficina']);
const propertyOperationSchema = z.enum(['VENTA', 'ALQUILER']);

const moneySchema = (allowZero: boolean) =>
  z.union([z.string(), z.number()]).transform((value, context) => {
    const parsed = validateMoneyText(value, { allowZero });
    if (!parsed.ok) {
      context.addIssue({
        code: 'custom',
        message: allowZero
          ? 'Debe ser un decimal no negativo con hasta 2 decimales.'
          : 'Debe ser un decimal positivo con hasta 2 decimales.',
      });
      return z.NEVER;
    }
    return parsed.value;
  });

const nonNegativeInteger = finiteNumberSchema.pipe(
  z.number().int('Debe ser un entero.').min(0, 'No puede ser negativo.').max(100, 'El valor es demasiado alto.'),
);

const surfaceSchema = finiteNumberSchema.pipe(
  z.number().min(0, 'La superficie no puede ser negativa.').max(10_000_000, 'La superficie es demasiado alta.'),
);

const imageSchema = z
  .object({
    url: propertyMediaUrlSchema,
    categoria: z
      .string()
      .transform(normalizeSingleLine)
      .pipe(z.string().min(1).max(80))
      .optional()
      .default('Sin clasificar'),
    public_id: z.union([z.string().max(512), z.null()]).optional(),
  })
  .strict()
  .transform(({ url, categoria }) => ({ url, public_id: null, categoria }));

const propertyFields = {
  uploadPropertyId: identifierSchema.optional(),
  uploadToken: z.string().trim().min(32).max(1_024).optional(),
  operacion: propertyOperationSchema,
  tipo: propertyTypeSchema,
  direccion: boundedSingleLine(3, REQUEST_LIMITS.addressChars, 'La dirección es obligatoria.'),
  barrio: z
    .union([
      boundedSingleLine(1, REQUEST_LIMITS.localityChars, 'El barrio es inválido.'),
      z.literal('').transform(() => null),
      z.null(),
      z.undefined(),
    ])
    .transform((value) => value ?? null),
  lat: latitudeSchema,
  lng: longitudeSchema,
  m2Total: surfaceSchema.pipe(z.number().positive('La superficie total debe ser positiva.')),
  m2Cubiertos: z
    .union([surfaceSchema, z.literal('').transform(() => null), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  ambientes: z
    .union([nonNegativeInteger, z.literal('').transform(() => null), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  dormitorios: nonNegativeInteger.default(0),
  banos: nonNegativeInteger.default(0),
  cocheras: nonNegativeInteger.default(0),
  moneda: z.enum(Moneda),
  precio: moneySchema(false),
  expensas: z
    .union([moneySchema(true), z.literal('').transform(() => null), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  caracteristicas: z
    .array(
      z
        .string()
        .transform(normalizeSingleLine)
        .pipe(z.string().min(1).max(REQUEST_LIMITS.characteristicChars)),
    )
    .max(REQUEST_LIMITS.characteristics)
    .transform((items) => [...new Set(items)]),
  imagenes: z
    .array(imageSchema)
    .max(REQUEST_LIMITS.propertyImages, `Máximo ${REQUEST_LIMITS.propertyImages} imágenes por propiedad.`),
  planoUrl: z
    .union([propertyMediaUrlSchema, z.literal('').transform(() => null), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  titulo: boundedSingleLine(4, REQUEST_LIMITS.titleChars, 'El título debe tener al menos 4 caracteres.'),
  descripcion: boundedMultiline(
    10,
    REQUEST_LIMITS.descriptionChars,
    'La descripción debe tener al menos 10 caracteres.',
  ),
};

export const createPropertySchema = z
  .object(propertyFields)
  .strict()
  .superRefine((value, context) => {
    if (value.tipo !== 'Lote' && value.m2Cubiertos !== null && value.m2Cubiertos > value.m2Total) {
      context.addIssue({
        code: 'custom',
        message: 'La superficie cubierta no puede superar la superficie total.',
        path: ['m2Cubiertos'],
      });
    }
    const urls = [...value.imagenes.map((image) => image.url), ...(value.planoUrl ? [value.planoUrl] : [])];
    if (new Set(urls).size !== urls.length) {
      context.addIssue({ code: 'custom', message: 'No se permiten archivos duplicados.', path: ['imagenes'] });
    }
  });
