import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const ROOT = 'propea/tenants';
const UPLOAD_SCOPE_VERSION = 1;
export const DRAFT_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

function safeSegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

export function cloudinaryPropertyPrefix(tenantId: string, propertyId: string): string {
  if (!safeSegment(tenantId) || !safeSegment(propertyId)) {
    throw new Error('Identificador de recurso inválido.');
  }
  return `${ROOT}/${tenantId}/properties/${propertyId}/`;
}

export function newCloudinaryPublicId(tenantId: string, propertyId: string): string {
  return `${cloudinaryPropertyPrefix(tenantId, propertyId)}${randomUUID()}`;
}

export function publicIdBelongsToProperty(publicId: string, tenantId: string, propertyId: string): boolean {
  try {
    const prefix = cloudinaryPropertyPrefix(tenantId, propertyId);
    const suffix = publicId.slice(prefix.length);
    return publicId.startsWith(prefix) && /^[0-9a-f-]{36}$/i.test(suffix);
  } catch {
    return false;
  }
}

type UploadScopePayload = {
  v: 1;
  tenantId: string;
  propertyId: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest();
}

export function issueUploadScope(
  tenantId: string,
  userId: string,
  secret: string,
  now = Date.now(),
): { propertyId: string; uploadToken: string; expiresAt: Date } {
  if (!safeSegment(tenantId) || !safeSegment(userId)) throw new Error('Identidad de subida inválida.');
  const propertyId = randomUUID();
  const payload: UploadScopePayload = {
    v: UPLOAD_SCOPE_VERSION,
    tenantId,
    propertyId,
    userId,
    issuedAt: now,
    expiresAt: now + DRAFT_UPLOAD_TTL_MS,
    nonce: randomBytes(16).toString('base64url'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return {
    propertyId,
    uploadToken: `${encoded}.${sign(encoded, secret).toString('base64url')}`,
    expiresAt: new Date(payload.expiresAt),
  };
}

export function verifyUploadScope(input: {
  tenantId: string;
  propertyId: string;
  userId: string;
  uploadToken: string;
  secret: string;
  now?: number;
}): UploadScopePayload | null {
  try {
    const [encoded, signature, extra] = input.uploadToken.split('.');
    if (!encoded || !signature || extra) return null;
    const expected = sign(encoded, input.secret);
    const received = Buffer.from(signature, 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as Record<string, unknown>;
    const now = input.now ?? Date.now();
    if (
      payload.v !== UPLOAD_SCOPE_VERSION ||
      payload.tenantId !== input.tenantId ||
      payload.propertyId !== input.propertyId ||
      payload.userId !== input.userId ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      typeof payload.nonce !== 'string' ||
      payload.issuedAt > now ||
      payload.expiresAt <= now ||
      payload.expiresAt - payload.issuedAt !== DRAFT_UPLOAD_TTL_MS ||
      !safeSegment(input.tenantId) ||
      !safeSegment(input.propertyId) ||
      !safeSegment(input.userId)
    ) return null;
    return payload as UploadScopePayload;
  } catch {
    return null;
  }
}
