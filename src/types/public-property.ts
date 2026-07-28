export type PublicInmobiliariaSummaryDto = {
  nombreAgencia: string;
  logoUrl: string | null;
  publicProfileUserId: string;
};

export type PublicAgentSummaryDto = {
  publicProfileUserId: string;
  nombre: string;
  avatarUrl: string | null;
};

export type PublicPropertyDetailDto = {
  id: string;
  titulo: string;
  descripcion: string;
  operacion: string;
  tipo: string;
  precio: number;
  moneda: string;
  direccion: string;
  barrio: string | null;
  latitud: number;
  longitud: number;
  m2Total: number;
  ambientes: number;
  dormitorios: number;
  banos: number;
  cocheras: number;
  caracteristicas: string[];
  imagenes: unknown;
  inmobiliaria: PublicInmobiliariaSummaryDto;
  agente: PublicAgentSummaryDto | null;
};

export type PublicPropertyOgDto = {
  id: string;
  titulo: string;
  descripcion: string;
  descripcionResumen: string;
  operacionLabel: string;
  precioFmt: string;
  dormitorios: number;
  banos: number;
  imagenUrl: string;
  imagenes: Array<{ url: string }>;
};

export type RecentPropertyDto = {
  id: string;
  titulo: string;
  precio: string;
  tipoOperacion: string;
  imagen: string;
};
