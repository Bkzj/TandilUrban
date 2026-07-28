import { z } from 'zod';

export const reportVariantQuerySchema = z
  .object({
    variant: z.enum(['total', 'valoracion']).default('total'),
  })
  .strict();
