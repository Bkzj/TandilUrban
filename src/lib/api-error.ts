import { randomUUID } from 'node:crypto';

import { z } from 'zod';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'EXTERNAL_UNAVAILABLE'
  | 'INTERNAL_ERROR';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'Revisá los datos ingresados.',
  UNAUTHORIZED: 'Tenés que iniciar sesión.',
  FORBIDDEN: 'No tenés permiso para realizar esta operación.',
  NOT_FOUND: 'El recurso no fue encontrado.',
  CONFLICT: 'La operación entra en conflicto con el estado actual.',
  RATE_LIMITED: 'Demasiados intentos. Intentá nuevamente más tarde.',
  PAYLOAD_TOO_LARGE: 'La solicitud supera el tamaño máximo permitido.',
  EXTERNAL_UNAVAILABLE: 'El servicio externo no está disponible temporalmente.',
  INTERNAL_ERROR: 'No se pudo completar la solicitud.',
};

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  EXTERNAL_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Readonly<Record<string, readonly string[]>>;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ApiErrorCode,
    options: {
      message?: string;
      fields?: Readonly<Record<string, readonly string[]>>;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function validationError(error: z.ZodError): ApiError {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_form';
    fields[field] ??= [];
    if (!fields[field].includes(issue.message)) fields[field].push(issue.message);
  }
  return new ApiError('VALIDATION_ERROR', { fields });
}

export function requestIdFrom(request: Request): string {
  const incoming = request.headers.get('x-request-id')?.trim();
  return incoming && /^[A-Za-z0-9_.-]{8,64}$/u.test(incoming) ? incoming : randomUUID();
}

export function apiErrorResponse(error: ApiError, requestId: string): Response {
  const headers = new Headers({ 'x-request-id': requestId });
  if (error.retryAfterSeconds !== undefined) {
    headers.set('Retry-After', String(error.retryAfterSeconds));
  }
  return Response.json(
    {
      error: error.message,
      code: error.code,
      requestId,
      ...(error.fields ? { fields: error.fields } : {}),
    },
    { status: error.status, headers },
  );
}
