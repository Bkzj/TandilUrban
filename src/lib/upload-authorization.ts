import { issueUploadScope, verifyUploadScope } from '@/lib/cloudinary-ownership';

type PropertyAccessRow = { id: string; inmobiliariaId: string; agenteId: string | null };

export class UploadAuthorizationError extends Error {}

export async function authorizeUploadTarget(input: {
  tenantId: string;
  userId: string;
  secret: string;
  propertyId?: string;
  uploadToken?: string;
  now?: number;
  findProperty: (propertyId: string) => Promise<PropertyAccessRow | null>;
  canModifyExistingProperty: (property: PropertyAccessRow) => boolean;
}): Promise<{ propertyId: string; uploadToken?: string; isDraft: boolean; expiresAt?: Date }> {
  if (!input.propertyId) {
    const scope = issueUploadScope(input.tenantId, input.userId, input.secret, input.now);
    return { ...scope, isDraft: true };
  }

  // Existing-property authorization always wins over any capability presented by the caller.
  const existing = await input.findProperty(input.propertyId);
  if (existing) {
    if (!input.canModifyExistingProperty(existing)) {
      throw new UploadAuthorizationError('No tenés permiso para subir archivos a esta propiedad.');
    }
    return { propertyId: existing.id, isDraft: false };
  }

  if (!input.uploadToken || !verifyUploadScope({
    tenantId: input.tenantId,
    propertyId: input.propertyId,
    userId: input.userId,
    uploadToken: input.uploadToken,
    secret: input.secret,
    now: input.now,
  })) {
    throw new UploadAuthorizationError('El alcance de subida no es válido o venció.');
  }
  return { propertyId: input.propertyId, uploadToken: input.uploadToken, isDraft: true };
}
