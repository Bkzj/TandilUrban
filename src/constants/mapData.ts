// Definimos la estructura exacta que tendrá un Punto de Interés
export interface PuntoDeInteres {
  id: string;
  nombre: string;
  tipo: 'escuela' | 'colectivo' | 'universidad';
  coordenadas: [number, number];
}

export const PUNTOS_INTERES_TANDIL: PuntoDeInteres[] = [
  // Escuelas de prueba cerca del centro
  { id: '1', nombre: 'Escuela Normal', tipo: 'escuela', coordenadas: [-37.3250, -59.1350] },
  { id: '2', nombre: 'Colegio San José', tipo: 'escuela', coordenadas: [-37.3180, -59.1310] },
  
  // Universidad
  { id: '3', nombre: 'UNICEN - Sede Central', tipo: 'universidad', coordenadas: [-37.3283, -59.1365] },

  // Paradas de colectivo simuladas
  { id: '4', nombre: 'Línea 501 (Rojo)', tipo: 'colectivo', coordenadas: [-37.3220, -59.1360] },
  { id: '5', nombre: 'Línea 503 (Azul)', tipo: 'colectivo', coordenadas: [-37.3200, -59.1300] },
  { id: '6', nombre: 'Línea 505 (Marrón)', tipo: 'colectivo', coordenadas: [-37.3245, -59.1320] },
];