import { Moneda } from '@prisma/client';
import { z } from 'zod';

import { finiteNumberSchema, normalizeMultiline, normalizeSingleLine } from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';

const aiPropertyContextSchema = z
  .object({
    operacion: z.enum(['VENTA', 'ALQUILER']),
    tipo: z.enum(['Casa', 'Departamento', 'Lote', 'Local', 'Oficina']),
    barrio: z.union([z.string().transform(normalizeSingleLine).pipe(z.string().max(120)), z.null(), z.undefined()]),
    m2Total: finiteNumberSchema.pipe(z.number().min(0).max(10_000_000)),
    ambientes: finiteNumberSchema.pipe(z.number().min(0).max(100)).optional().nullable(),
    dormitorios: finiteNumberSchema.pipe(z.number().min(0).max(100)).optional(),
    banos: finiteNumberSchema.pipe(z.number().min(0).max(100)).optional(),
    cocheras: finiteNumberSchema.pipe(z.number().min(0).max(100)).optional(),
    moneda: z.enum(Moneda),
    precio: z.union([z.string().max(64), z.number().finite()]),
    caracteristicas: z
      .array(z.string().transform(normalizeSingleLine).pipe(z.string().min(1).max(REQUEST_LIMITS.characteristicChars)))
      .max(REQUEST_LIMITS.characteristics),
  })
  .strip();

export const aiTextRequestSchema = z
  .object({
    data: aiPropertyContextSchema,
    notasIA: z
      .union([z.string(), z.number().transform(String)])
      .transform(normalizeMultiline)
      .pipe(z.string().max(REQUEST_LIMITS.aiNotesChars))
      .default(''),
    portadaBase64: z.string().max(Math.ceil(REQUEST_LIMITS.aiCoverImageBytes / 3) * 4 + 128).optional(),
  })
  .strict();

export type AiTextRequest = z.infer<typeof aiTextRequestSchema>;

export const aiImageOrderingSchema = z
  .object({
    layoutContext: z
      .string()
      .transform(normalizeMultiline)
      .pipe(z.string().max(REQUEST_LIMITS.aiNotesChars))
      .default(''),
    imagesBase64: z
      .array(z.string().min(1).max(Math.ceil(REQUEST_LIMITS.aiImageBytes / 3) * 4 + 128))
      .min(1)
      .max(REQUEST_LIMITS.aiImages),
  })
  .strict();

export const aiGeneratedTextSchema = z
  .object({
    titulo: z.string().transform(normalizeSingleLine).pipe(z.string().min(1).max(REQUEST_LIMITS.titleChars)),
    descripcion: z
      .string()
      .transform(normalizeMultiline)
      .pipe(z.string().min(1).max(REQUEST_LIMITS.aiOutputDescriptionChars)),
  })
  .strict();

export const aiPhotoClassificationSchema = z
  .array(
    z
      .object({
        index: z.number().int().min(0),
        categoria: z.string().transform(normalizeSingleLine).pipe(z.string().min(1).max(80)),
        orden_sugerido: z.number().int().min(1),
      })
      .strict(),
  )
  .max(REQUEST_LIMITS.aiImages);
