import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { configureCloudinary, cloudinary, isCloudinaryServerConfigured } from '@/lib/cloudinary';
import { uploadManagedImage } from '@/lib/managed-upload-service';
import { requireAgencyPublishingContext } from '@/lib/panel-agency-publish';
import { requireAuthenticatedUser } from '@/lib/panel-authorization';
import { RolUsuario } from '@/generated/prisma';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { UploadAuthorizationError } from '@/lib/upload-authorization';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { parseImageDataUrl, uploadBodySchema } from '@/lib/validation/upload';

const TENANT_DAILY_BYTES = 250 * 1024 * 1024;
const TENANT_DAILY_FILES = 200;
const MIME_FORMATS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export async function POST(request: Request) {
  return runRouteHandler(request, 'managed_upload.failed', async () => {
    const body = await parseJsonBody(
      request,
      uploadBodySchema,
      REQUEST_LIMITS.uploadRequestBytes,
    );
    const authenticated = await requireAuthenticatedUser();
    const publishing = authenticated.user.rol === RolUsuario.ADMIN
      ? body.propertyId
        ? await prisma.propiedad.findUnique({ where: { id: body.propertyId }, select: { inmobiliariaId: true } })
        : null
      : await requireAgencyPublishingContext();
    if (!publishing) throw new ApiError('FORBIDDEN', { message: 'No se pudo autorizar la subida.' });
    const inmobiliariaId = publishing.inmobiliariaId;
    const user = authenticated.user;
    const rates = configuredRateLimitStore();
    const [ipRate, userRate, tenantRate] = await Promise.all([
      rates.consume(`upload:ip:${requestIp(request)}`, { limit: 80, windowMs: 60 * 60 * 1000 }),
      rates.consume(`upload:user:${user.id}`, { limit: 120, windowMs: 60 * 60 * 1000 }),
      rates.consume(`upload:tenant:${inmobiliariaId}`, { limit: 200, windowMs: 60 * 60 * 1000 }),
    ]);
    if (!ipRate.allowed || !userRate.allowed || !tenantRate.allowed) {
      throw new ApiError('RATE_LIMITED', {
        message: 'Se alcanzó temporalmente el límite de subidas.',
        retryAfterSeconds: Math.max(
          ipRate.retryAfterSeconds,
          userRate.retryAfterSeconds,
          tenantRate.retryAfterSeconds,
        ),
      });
    }
    if (!isCloudinaryServerConfigured()) {
      throw new ApiError('EXTERNAL_UNAVAILABLE', {
        message: 'La subida de archivos no está disponible temporalmente.',
      });
    }

    const image = parseImageDataUrl(body.file, REQUEST_LIMITS.uploadImageBytes);
    if (!image) {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'La imagen debe ser JPEG, PNG o WebP y respetar el tamaño máximo.',
        fields: { file: ['Imagen inválida o demasiado grande.'] },
      });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const quota = await prisma.cloudinaryAsset.aggregate({
      where: { inmobiliariaId, createdAt: { gte: since } },
      _sum: { bytes: true },
      _count: { id: true },
    });
    if (
      (quota._sum.bytes ?? 0) + image.bytes.byteLength > TENANT_DAILY_BYTES ||
      quota._count.id >= TENANT_DAILY_FILES
    ) {
      throw new ApiError('RATE_LIMITED', {
        message: 'La inmobiliaria alcanzó su cuota diaria de archivos.',
        retryAfterSeconds: 60 * 60,
      });
    }

    const secret = getServerEnvironment().NEXTAUTH_SECRET;
    configureCloudinary();
    try {
      const uploaded = await uploadManagedImage({
        tenantId: inmobiliariaId,
        userId: user.id,
        secret,
        propertyId: body.propertyId,
        uploadToken: body.uploadToken,
        findProperty: (propertyId) =>
          prisma.propiedad.findUnique({
            where: { id: propertyId },
            select: { id: true, inmobiliariaId: true, agenteId: true },
          }),
        canModifyExistingProperty: (property) => userCanModifyPropiedad(user, property),
        mimeType: image.mimeType,
        canonicalDataUri: `data:${image.mimeType};base64,${image.base64}`,
        uploadRemote: async (dataUri, publicId) => {
          const result = await cloudinary.uploader.upload(dataUri, {
            public_id: publicId,
            overwrite: false,
            resource_type: 'image',
            allowed_formats: Object.values(MIME_FORMATS),
          });
          return {
            publicId: result.public_id,
            secureUrl: result.secure_url,
            bytes: result.bytes,
          };
        },
        destroyRemote: async (publicId) => {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true,
          });
        },
        createOwnershipRecord: async (record) => {
          await prisma.cloudinaryAsset.create({ data: record });
        },
      });
      return NextResponse.json({
        url: uploaded.url,
        public_id: uploaded.publicId,
        propertyId: uploaded.propertyId,
        uploadToken: uploaded.uploadToken,
      });
    } catch (error) {
      if (error instanceof UploadAuthorizationError) {
        throw new ApiError('FORBIDDEN', { message: 'No se pudo autorizar la subida.' });
      }
      throw error;
    }
  });
}
