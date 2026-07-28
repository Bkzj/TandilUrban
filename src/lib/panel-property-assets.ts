import { publicIdBelongsToProperty, verifyUploadScope } from '@/lib/cloudinary-ownership';
import { prisma } from '@/lib/prisma';
import type { PropiedadImagenItem } from '@/types/panel';
import { getServerEnvironment } from '@/lib/validation/environment';

type RegisteredAsset = {
  id: string;
  publicId: string;
  secureUrl: string;
  inmobiliariaId: string;
  propertyId: string;
  status: 'DRAFT' | 'BOUND' | 'PENDING_DELETION' | 'DELETED';
  expiresAt: Date | null;
};

export function registeredAssetBelongsToProperty(
  asset: RegisteredAsset,
  tenantId: string,
  propertyId: string,
): boolean {
  return asset.inmobiliariaId === tenantId &&
    asset.propertyId === propertyId &&
    publicIdBelongsToProperty(asset.publicId, tenantId, propertyId);
}

type ResolveAssetsInput = {
  tenantId: string;
  propertyId: string;
  images: PropiedadImagenItem[];
  planoUrl: string | null;
  legacyImages?: PropiedadImagenItem[];
  legacyPlanoUrl?: string | null;
};

export async function resolvePropertyAssets(input: ResolveAssetsInput): Promise<{
  images: PropiedadImagenItem[];
  planoUrl: string | null;
  assetIds: string[];
}> {
  const urls = [...input.images.map(({ url }) => url), ...(input.planoUrl ? [input.planoUrl] : [])];
  const assets = urls.length === 0 ? [] : await prisma.cloudinaryAsset.findMany({
    where: { secureUrl: { in: urls } },
    select: {
      id: true,
      publicId: true,
      secureUrl: true,
      inmobiliariaId: true,
      propertyId: true,
      status: true,
      expiresAt: true,
    },
  });
  const registered = new Map(
    assets
      .filter((asset) =>
        registeredAssetBelongsToProperty(asset, input.tenantId, input.propertyId) &&
        ['DRAFT', 'BOUND'].includes(asset.status) &&
        (asset.status !== 'DRAFT' || (asset.expiresAt?.getTime() ?? 0) > Date.now()),
      )
      .map((asset) => [asset.secureUrl, asset]),
  );
  const legacyImages = new Map((input.legacyImages ?? []).map((image) => [image.url, image]));

  const images = input.images.map((image) => {
    const asset = registered.get(image.url);
    if (asset) return { ...image, public_id: asset.publicId };
    const legacy = legacyImages.get(image.url);
    if (legacy) return { ...image, public_id: legacy.public_id ?? null };
    throw new Error('La imagen no pertenece a la propiedad seleccionada.');
  });

  if (input.planoUrl && !registered.has(input.planoUrl) && input.planoUrl !== input.legacyPlanoUrl) {
    throw new Error('El plano no pertenece a la propiedad seleccionada.');
  }
  return { images, planoUrl: input.planoUrl, assetIds: [...registered.values()].map(({ id }) => id) };
}

export function validateNewPropertyUploadScope(
  tenantId: string,
  userId: string,
  propertyId: string | undefined,
  uploadToken: string | undefined,
): string | undefined {
  if (!propertyId && !uploadToken) return undefined;
  const secret = getServerEnvironment().NEXTAUTH_SECRET;
  if (!propertyId || !uploadToken || !verifyUploadScope({
    tenantId,
    propertyId,
    userId,
    uploadToken,
    secret,
  })) {
    throw new Error('El alcance de subida no es válido.');
  }
  return propertyId;
}

export async function bindDraftAssets(
  store: {
    updateMany(input: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  },
  input: { assetIds: string[]; tenantId: string; propertyId: string; userId: string; now?: Date },
): Promise<void> {
  if (input.assetIds.length === 0) return;
  const uniqueIds = [...new Set(input.assetIds)];
  const now = input.now ?? new Date();
  const result = await store.updateMany({
    where: {
      id: { in: uniqueIds },
      inmobiliariaId: input.tenantId,
      propertyId: input.propertyId,
      createdById: input.userId,
      status: 'DRAFT',
      expiresAt: { gt: now },
    },
    data: { status: 'BOUND', boundAt: now, expiresAt: null },
  });
  if (result.count !== uniqueIds.length) {
    throw new Error('No se pudieron vincular todos los archivos de la propiedad.');
  }
}
