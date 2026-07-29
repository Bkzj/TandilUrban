import { z } from 'zod';

import { ApiError, validationError } from '@/lib/api-error';
import { REQUEST_LIMITS } from '@/lib/validation/limits';

async function readBodyWithinLimit(request: Request, maximumBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const contentLength = Number(declared);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new ApiError('VALIDATION_ERROR', { message: 'Content-Length inválido.' });
    }
    if (contentLength > maximumBytes) throw new ApiError('PAYLOAD_TOO_LARGE');
  }
  if (!request.body) throw new ApiError('VALIDATION_ERROR', { message: 'La solicitud no tiene cuerpo.' });

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new ApiError('PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  maximumBytes = REQUEST_LIMITS.jsonBytes,
): Promise<z.infer<S>> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new ApiError('VALIDATION_ERROR', { message: 'El cuerpo debe usar application/json.' });
  }
  const bytes = await readBodyWithinLimit(request, maximumBytes);
  let input: unknown;
  try {
    const decoded: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
    input = decoded;
  } catch {
    throw new ApiError('VALIDATION_ERROR', { message: 'El JSON no es válido.' });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

export function parseSearchParams<S extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: S,
): z.infer<S> {
  const input: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

export function validateRouteParams<S extends z.ZodType>(params: unknown, schema: S): z.infer<S> {
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}
