import { v2 as cloudinary } from 'cloudinary';

let configured = false;

export function isCloudinaryServerConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinary(): void {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Faltan variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.');
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export { cloudinary };

/**
 * Extrae el public_id de una URL de entrega Cloudinary (sin transformaciones custom en el path).
 */
export function extractPublicIdFromCloudinaryUrl(url: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== 'res.cloudinary.com') return null;
    const prefix = `/${cloudName}/image/upload/`;
    const idx = u.pathname.indexOf(prefix);
    if (idx === -1) return null;
    const segments = u.pathname.slice(idx + prefix.length).split('/').filter(Boolean);
    let i = 0;
    while (i < segments.length) {
      const seg = segments[i];
      if (/^v\d+$/.test(seg)) {
        i++;
        continue;
      }
      if (seg.includes(',')) {
        i++;
        continue;
      }
      break;
    }
    const tail = segments.slice(i).join('/');
    if (!tail) return null;
    return tail.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

export function publicIdsFromImageUrls(urls: string[]): string[] {
  const ids = new Set<string>();
  for (const url of urls) {
    const id = extractPublicIdFromCloudinaryUrl(url);
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Carpetas `tandilurban/propiedades/{slug}` derivadas de public_ids (para delete_folder). */
export function managedPropertyFoldersFromPublicIds(publicIds: string[]): string[] {
  const folders = new Set<string>();
  const re = /^tandilurban\/propiedades\/[^/]+/;
  for (const id of publicIds) {
    const m = id.match(re);
    if (m) folders.add(m[0]);
  }
  return [...folders];
}
