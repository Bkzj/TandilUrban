import { createHmac } from 'node:crypto';

export const PROPERTY_VIEW_DEDUPLICATION_MS = 30 * 60 * 1000;

export type PropertyViewProperty = {
  id: string;
  inmobiliariaId: string;
};

export type PropertyViewActor = {
  role: 'ADMIN' | 'INMOBILIARIA' | 'AGENTE' | 'USUARIO_NORMAL';
} | null;

export type PropertyViewDependencies = {
  findPublicProperty: (propertyId: string) => Promise<PropertyViewProperty | null>;
  recordIfOutsideWindow: (input: {
    property: PropertyViewProperty;
    anonymousKey: string;
    deduplicationKeys: readonly string[];
    since: Date;
    now: Date;
  }) => Promise<boolean>;
};

export type PropertyViewResult =
  | { status: 'not_found' }
  | { status: 'ignored' }
  | { status: 'counted' | 'deduplicated' };

export function shouldIgnoreAutomatedView(headers: Headers): boolean {
  if (headers.get('dnt') === '1' || headers.get('sec-gpc') === '1') return true;
  const purpose = `${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''}`.toLowerCase();
  if (purpose.includes('prefetch') || purpose.includes('preview')) return true;
  const userAgent = (headers.get('user-agent') ?? '').toLowerCase();
  return /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|headless|lighthouse/.test(userAgent);
}

export function deriveRotatingAnonymousKey(input: {
  secret: string;
  visitorToken: string;
  now: Date;
}): string {
  const rotationDay = input.now.toISOString().slice(0, 10);
  return createHmac('sha256', input.secret)
    .update(`property-view:v1:${rotationDay}:${input.visitorToken}`)
    .digest('hex');
}

export async function registerPropertyView(
  input: {
    propertyId: string;
    anonymousKey: string;
    previousAnonymousKey?: string;
    actor: PropertyViewActor;
    headers: Headers;
    now?: Date;
  },
  dependencies: PropertyViewDependencies,
): Promise<PropertyViewResult> {
  const property = await dependencies.findPublicProperty(input.propertyId);
  if (!property) return { status: 'not_found' };
  if (input.actor && input.actor.role !== 'USUARIO_NORMAL') return { status: 'ignored' };
  if (shouldIgnoreAutomatedView(input.headers)) return { status: 'ignored' };

  const now = input.now ?? new Date();
  const counted = await dependencies.recordIfOutsideWindow({
    property,
    anonymousKey: input.anonymousKey,
    deduplicationKeys: input.previousAnonymousKey
      ? [input.anonymousKey, input.previousAnonymousKey]
      : [input.anonymousKey],
    since: new Date(now.getTime() - PROPERTY_VIEW_DEDUPLICATION_MS),
    now,
  });
  return { status: counted ? 'counted' : 'deduplicated' };
}
