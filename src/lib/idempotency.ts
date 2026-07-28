import { createHash } from 'node:crypto';

export class IdempotencyConflictError extends Error {
  constructor() {
    super('IDEMPOTENCY_CONFLICT');
    this.name = 'IdempotencyConflictError';
  }
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalize(nested)}`)
    .join(',')}}`;
}

export function hashIdempotencyKey(scope: string, rawKey: string): string {
  return createHash('sha256').update(scope).update('\0').update(rawKey).digest('hex');
}

export function fingerprintIdempotentInput(operation: string, input: unknown): string {
  return createHash('sha256').update(operation).update('\0').update(canonicalize(input)).digest('hex');
}
