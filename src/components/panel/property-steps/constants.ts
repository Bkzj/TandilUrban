import type { PropertyFormData, TipoInmueble } from '@/types/panel';

export const INITIAL_DATA: PropertyFormData = {
  operacion: '',
  tipo: '',
  direccion: '',
  barrio: '',
  m2Total: '',
  m2Cubiertos: '',
  ambientes: '',
  moneda: 'USD',
  precio: '',
  expensas: '',
  caracteristicas: [],
  imagenes: [],
  titulo: '',
  descripcion: '',
};

export const TIPOS_INMUEBLE: TipoInmueble[] = ['Casa', 'Departamento', 'Lote', 'Local', 'Oficina'];

export const CARACTERISTICAS: string[] = [
  'Piscina',
  'Quincho',
  'Parrilla',
  'Cochera',
  'Jardín',
  'Balcón',
  'Terraza',
  'Suite',
  'Vestidor',
  'Lavadero',
  'Aire acondicionado',
  'Calefacción central',
  'Losa radiante',
  'Ascensor',
  'Seguridad 24hs',
  'Pet friendly',
  'Amueblado',
  'Vista panorámica',
];

export const STEPS = [
  'operacion',
  'tipo',
  'ubicacion',
  'dimensiones',
  'precio',
  'caracteristicas',
  'imagenes',
  'textos',
] as const;

export type StepKey = (typeof STEPS)[number];

export const TOTAL_STEPS = STEPS.length;
