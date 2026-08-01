import type { Prisma, PrismaClient, SecurityEventType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const SENSITIVE = /(password|secret|token|totp|recovery|authorization|cookie|credential|code|hash)/iu;
const MAX_DEPTH = 4;

export function sanitizeSecurityEventMetadata(value: unknown, depth = 0): Prisma.InputJsonValue | undefined {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (value === null) return '[NULL]';
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 256);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeSecurityEventMetadata(item, depth + 1) ?? null);
  if (typeof value !== 'object') return undefined;
  const output: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, nested] of Object.entries(value).slice(0, 30)) {
    if (SENSITIVE.test(key)) continue;
    const sanitized = sanitizeSecurityEventMetadata(nested, depth + 1);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

type EventClient = Pick<PrismaClient, 'securityEvent'>;
export function recordSecurityEvent(input: { userId?: string; type: SecurityEventType; requestId?: string; category?: string; metadata?: unknown }, client: EventClient = prisma) {
  const metadata = sanitizeSecurityEventMetadata(input.metadata);
  return client.securityEvent.create({ data: { userId: input.userId, type: input.type, requestId: input.requestId?.slice(0, 128), category: input.category?.slice(0, 128), ...(metadata === undefined ? {} : { metadata }) }, select: { id: true, type: true, createdAt: true } });
}
