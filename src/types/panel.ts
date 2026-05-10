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
  m2Total: string;
  m2Cubiertos: string;
  ambientes: string;
  moneda: Moneda;
  precio: string;
  expensas: string;
  caracteristicas: string[];
  imagenes: string[];
  titulo: string;
  descripcion: string;
};

export type StepProps = {
  data: PropertyFormData;
  update: (key: keyof PropertyFormData, value: any) => void;
  onNext: () => void;
};
