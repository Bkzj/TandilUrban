/** Propiedad serializada para listado público / mapa explorador. */
export type PublicPropiedadListItem = {
  id: string;
  titulo: string;
  direccion: string;
  barrio: string | null;
  precio: number;
  moneda: string;
  operacion: string;
  tipo: string;
  ambientes: number;
  dormitorios: number;
  banos: number;
  m2Total: number;
  latitud: number;
  longitud: number;
  imagenes: string[];
  destacada: boolean;
  esExclusiva: boolean;
};
