import { NextResponse } from 'next/server';

import { AuthError } from '@/lib/auth';
import { configureCloudinary, cloudinary, isCloudinaryServerConfigured } from '@/lib/cloudinary';
import { requireAgencyPublishingContext } from '@/lib/panel-agency-publish';

const MAX_BYTES = 12 * 1024 * 1024;
const FOLDER_RE = /^tandilurban\/[a-zA-Z0-9/_-]+$/;

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

function sanitizeFolderPath(raw: unknown): string {
  const fallback = 'tandilurban/general';
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const fp = raw.trim().replace(/^\/+|\/+$/g, '');
  if (fp.includes('..')) return fallback;
  if (!FOLDER_RE.test(fp)) return fallback;
  return fp;
}

function sanitizePublicId(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  let s = raw.trim().replace(/\.[a-zA-Z0-9]+$/, '');
  s = s.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (s.length > 120) s = s.slice(0, 120);
  return s || fallback;
}

function estimateBase64Bytes(dataUriOrBase64: string): number {
  const raw = dataUriOrBase64.includes(',') ? dataUriOrBase64.split(',')[1]! : dataUriOrBase64;
  return Math.ceil((raw.length * 3) / 4);
}

export async function POST(request: Request) {
  try {
    await requireAgencyPublishingContext();

    if (!isCloudinaryServerConfigured()) {
      return NextResponse.json(
        { error: 'Subida de archivos no disponible (Cloudinary sin configurar).' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      file?: unknown;
      folderPath?: unknown;
      publicId?: unknown;
    };

    if (typeof body.file !== 'string' || !body.file.trim()) {
      return NextResponse.json({ error: 'Falta el archivo (base64 o data URL).' }, { status: 400 });
    }

    const file = body.file.trim();
    if (estimateBase64Bytes(file) > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo permitido.' }, { status: 400 });
    }

    const folder = sanitizeFolderPath(body.folderPath);
    const fallbackId = `asset-${Date.now()}`;
    const publicId = sanitizePublicId(body.publicId, fallbackId);

    configureCloudinary();

    const result = await cloudinary.uploader.upload(file, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 });
  }
}
