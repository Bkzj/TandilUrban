import { newCloudinaryPublicId } from '@/lib/cloudinary-ownership';
import { authorizeUploadTarget } from '@/lib/upload-authorization';

type PropertyAccessRow = { id: string; inmobiliariaId: string; agenteId: string | null };
type UploadResult = { publicId: string; secureUrl: string; bytes: number };

export async function uploadManagedImage(input: {
  tenantId: string;
  userId: string;
  secret: string;
  propertyId?: string;
  uploadToken?: string;
  mimeType: string;
  canonicalDataUri: string;
  findProperty: (propertyId: string) => Promise<PropertyAccessRow | null>;
  canModifyExistingProperty: (property: PropertyAccessRow) => boolean;
  uploadRemote: (dataUri: string, publicId: string) => Promise<UploadResult>;
  destroyRemote: (publicId: string) => Promise<void>;
  createOwnershipRecord: (record: {
    publicId: string;
    secureUrl: string;
    bytes: number;
    mimeType: string;
    inmobiliariaId: string;
    propertyId: string;
    createdById: string;
    status: 'DRAFT' | 'BOUND';
    expiresAt: Date | null;
    boundAt: Date | null;
  }) => Promise<void>;
}) {
  const target = await authorizeUploadTarget({
    tenantId: input.tenantId,
    userId: input.userId,
    secret: input.secret,
    propertyId: input.propertyId,
    uploadToken: input.uploadToken,
    findProperty: input.findProperty,
    canModifyExistingProperty: input.canModifyExistingProperty,
  });
  const requestedPublicId = newCloudinaryPublicId(input.tenantId, target.propertyId);
  const remote = await input.uploadRemote(input.canonicalDataUri, requestedPublicId);
  try {
    await input.createOwnershipRecord({
      publicId: remote.publicId,
      secureUrl: remote.secureUrl,
      bytes: remote.bytes,
      mimeType: input.mimeType,
      inmobiliariaId: input.tenantId,
      propertyId: target.propertyId,
      createdById: input.userId,
      status: target.isDraft ? 'DRAFT' : 'BOUND',
      expiresAt: target.isDraft ? target.expiresAt ?? null : null,
      boundAt: target.isDraft ? null : new Date(),
    });
  } catch (error) {
    await input.destroyRemote(remote.publicId);
    throw error;
  }
  return { url: remote.secureUrl, publicId: remote.publicId, ...target };
}
