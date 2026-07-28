import { v2 as cloudinary } from 'cloudinary';
import { getServerEnvironment } from '@/lib/validation/environment';

let configured = false;

export function isCloudinaryServerConfigured(): boolean {
  const environment = getServerEnvironment();
  return Boolean(
    environment.CLOUDINARY_CLOUD_NAME &&
      environment.CLOUDINARY_API_KEY &&
      environment.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinary(): void {
  if (configured) return;
  const environment = getServerEnvironment();
  const cloud_name = environment.CLOUDINARY_CLOUD_NAME;
  const api_key = environment.CLOUDINARY_API_KEY;
  const api_secret = environment.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Faltan variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.');
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export { cloudinary };
