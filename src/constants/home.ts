// src/constants/home.ts

export const IMAGENES_HOME = {
  default: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2064&auto=format&fit=crop',
  propiedades: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
  destacados: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
  tasaciones: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop',
  nosotros: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2069&auto=format&fit=crop',
};

/**
 * MP4 servido desde tu propio dominio (`public/videos/hero-sunset.mp4`).
 * Las URLs directas de Mixkit suelen responder 403 si no se cargan desde mixkit.co.
 * Para usar un clip de Mixkit: descargalo desde la web y reemplazá este archivo.
 */
export const HERO_VIDEO_SRC = '/videos/hero-sunset.mp4';

/** Imagen fija bajo el video (si el MP4 falla o tarda, no queda pantalla negra). */
export const HERO_VIDEO_STILL =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop';
