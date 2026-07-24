import { NextResponse } from 'next/server';

import { AuthError } from '@/lib/auth';
import { configureCloudinary, cloudinary, isCloudinaryServerConfigured } from '@/lib/cloudinary';
import { requireAgencyPublishingContext } from '@/lib/panel-agency-publish';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { UploadAuthorizationError } from '@/lib/upload-authorization';
import { uploadManagedImage } from '@/lib/managed-upload-service';

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_REQUEST_BYTES = 17 * 1024 * 1024;
const TENANT_DAILY_BYTES = 250 * 1024 * 1024;
const TENANT_DAILY_FILES = 200;
const MIME_FORMATS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
type AllowedMime = keyof typeof MIME_FORMATS;

function authResponse(error: unknown): NextResponse | null {
  return error instanceof AuthError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : null;
}

function parseImageDataUri(value: unknown): { bytes: Buffer; mimeType: AllowedMime; canonical: string } | null {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 128) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const mimeType = match[1] as AllowedMime;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES) return null;
  const validSignature =
    (mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mimeType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === 'image/webp' && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!validSignature) return null;
  return { bytes, mimeType, canonical: `data:${mimeType};base64,${bytes.toString('base64')}` };
}

async function readLimitedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('Solicitud sin cuerpo.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RangeError('REQUEST_TOO_LARGE');
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
  return JSON.parse(body) as unknown;
}

export async function POST(request: Request) {
  try {
    const { inmobiliariaId, user } = await requireAgencyPublishingContext();
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(contentLength) || contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'La solicitud supera el tamaño máximo permitido.' }, { status: 413 });
    }

    const rateLimits = configuredRateLimitStore();
    const [ipRate, userRate, tenantRate] = await Promise.all([
      rateLimits.consume(`upload:ip:${requestIp(request)}`, { limit: 80, windowMs: 60 * 60 * 1000 }),
      rateLimits.consume(`upload:user:${user.id}`, { limit: 120, windowMs: 60 * 60 * 1000 }),
      rateLimits.consume(`upload:tenant:${inmobiliariaId}`, { limit: 200, windowMs: 60 * 60 * 1000 }),
    ]);
    if (!ipRate.allowed || !userRate.allowed || !tenantRate.allowed) {
      return NextResponse.json({ error: 'Se alcanzó temporalmente el límite de subidas.' }, { status: 429 });
    }

    if (!isCloudinaryServerConfigured()) {
      return NextResponse.json(
        { error: 'Subida de archivos no disponible (Cloudinary sin configurar).' },
        { status: 503 },
      );
    }

    const body = await readLimitedJson(request);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const image = parseImageDataUri(input.file);
    if (!image) {
      return NextResponse.json({ error: 'La imagen debe ser JPEG, PNG o WebP y respetar el tamaño máximo.' }, { status: 400 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const quota = await prisma.cloudinaryAsset.aggregate({
      where: { inmobiliariaId, createdAt: { gte: since } },
      _sum: { bytes: true },
      _count: { id: true },
    });
    if ((quota._sum.bytes ?? 0) + image.bytes.length > TENANT_DAILY_BYTES || quota._count.id >= TENANT_DAILY_FILES) {
      return NextResponse.json({ error: 'La inmobiliaria alcanzó su cuota diaria de archivos.' }, { status: 429 });
    }

    const secret = process.env.NEXTAUTH_SECRET?.trim();
    if (!secret) throw new Error('Configuración inválida: falta NEXTAUTH_SECRET.');

    configureCloudinary();
    const uploaded = await uploadManagedImage({
      tenantId: inmobiliariaId,
      userId: user.id,
      secret,
      propertyId: typeof input.propertyId === 'string' ? input.propertyId.trim() : undefined,
      uploadToken: typeof input.uploadToken === 'string' ? input.uploadToken.trim() : undefined,
      findProperty: (propertyId) => prisma.propiedad.findUnique({
        where: { id: propertyId },
        select: { id: true, inmobiliariaId: true, agenteId: true },
      }),
      canModifyExistingProperty: (property) => userCanModifyPropiedad(user, property),
      mimeType: image.mimeType,
      canonicalDataUri: image.canonical,
      uploadRemote: async (dataUri, publicId) => {
        const result = await cloudinary.uploader.upload(dataUri, {
          public_id: publicId,
          overwrite: false,
          resource_type: 'image',
          allowed_formats: Object.values(MIME_FORMATS),
        });
        return { publicId: result.public_id, secureUrl: result.secure_url, bytes: result.bytes };
      },
      destroyRemote: async (publicId) => {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
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
    if (error instanceof RangeError && error.message === 'REQUEST_TOO_LARGE') {
      return NextResponse.json({ error: 'La solicitud supera el tamaño máximo permitido.' }, { status: 413 });
    }
    if (error instanceof UploadAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const handled = authResponse(error);
    if (handled) return handled;
    console.error('[POST /api/upload]', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 });
  }
}
