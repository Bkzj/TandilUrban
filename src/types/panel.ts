/** Una foto de propiedad persistida (URL Cloudinary + metadatos). */
export type PropiedadImagenItem = {
  url: string;
  public_id?: string | null;
  categoria?: string | null;
};

/** Fila de propiedad en el panel administrador (serializable para client components). */
export type PanelPropiedadTableRow = {
  id: string;
  titulo: string;
  imagenes: PropiedadImagenItem[];
  operacion: string;
  tipo: string;
  precio: number;
  moneda: string;
  visitas: number;
  consultas: number;
  createdAt: string;
};

/** Estado serializado desde Prisma `EstadoContacto`. */
export type PanelLeadEstado = 'NUEVO' | 'LEIDO' | 'RESPONDIDO';

/** Lead / consulta en inbox del panel (tenant-safe desde server). */
export type PanelLeadRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string;
  estado: PanelLeadEstado;
  createdAt: string;
  propiedad: {
    id: string;
    titulo: string;
    imagenes: PropiedadImagenItem[];
  };
};

/** Fila de agente serializada para el panel (client + server). */
export type Agente = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
};

export type Operacion = 'VENTA' | 'ALQUILER';
export type TipoInmueble = 'Casa' | 'Departamento' | 'Lote' | 'Local' | 'Oficina';
export type Moneda = 'USD' | 'ARS';

export type PropertyFormData = {
  operacion: Operacion | '';
  tipo: TipoInmueble | '';
  direccion: string;
  barrio: string;
  lat: number | null;
  lng: number | null;
  m2Total: string;
  m2Cubiertos: string;
  ambientes: string;
  dormitorios: number;
  banos: number;
  cocheras: number;
  moneda: Moneda;
  precio: string;
  expensas: string;
  caracteristicas: string[];
  imagenes: PropiedadImagenItem[];
  layoutContext: string;
  titulo: string;
  descripcion: string;
};

export type StepProps = {
  data: PropertyFormData;
  update: (key: keyof PropertyFormData, value: any) => void;
  onNext: () => void;
  isEditMode?: boolean;
};
