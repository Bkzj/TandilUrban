import type { PropiedadImagenItem } from './panel';

/** Cuerpo esperado por `POST /api/auth/register`. */
export type RegisterPayload = {
  nombre: string;
  email: string;
  password: string;
};

/** Cuerpo esperado por `POST /api/contacto`. */
export type ContactoPayload = {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
  propiedadId: string;
};

/** Cuerpo esperado por `POST /api/panel/equipo`. */
export type CreateAgentePayload = {
  nombre: string;
  email: string;
  password: string;
};

/**
 * Cuerpo esperado por `POST /api/panel/propiedades`.
 * Refleja el output del onboarding lineal del panel.
 */
export type CreatePropiedadPayload = {
  operacion: 'VENTA' | 'ALQUILER';
  tipo: string;
  direccion: string;
  barrio?: string | null;
  lat: number;
  lng: number;
  m2Total: number;
  m2Cubiertos?: number | null;
  ambientes?: number | null;
  dormitorios: number;
  banos: number;
  cocheras: number;
  moneda: 'USD' | 'ARS';
  precio: number;
  expensas?: number | null;
  caracteristicas: string[];
  imagenes: PropiedadImagenItem[];
  planoUrl?: string | null;
  titulo: string;
  descripcion: string;
};
