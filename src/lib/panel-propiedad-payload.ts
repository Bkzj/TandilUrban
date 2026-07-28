import { createPropertySchema, type CreatePropertyInput } from '@/lib/validation/property';

export function validarPropiedadPayload(
  body: unknown,
): { ok: true; data: CreatePropertyInput } | { ok: false; error: string } {
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Cuerpo de la solicitud inválido.',
    };
  }
  return { ok: true, data: parsed.data };
}
