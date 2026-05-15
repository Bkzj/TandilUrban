'use client';

import MapComponent from '@/components/Map';

type Props = {
  propiedadId: string;
  titulo: string;
  latitud: number;
  longitud: number;
};

export function PropiedadUbicacionMap({ propiedadId, titulo, latitud, longitud }: Props) {
  return (
    <div className="h-[400px] w-full overflow-hidden rounded-2xl border border-gray-200">
      <MapComponent
        centro={[latitud, longitud]}
        zoom={14}
        marcadorFijo={{
          id: propiedadId,
          lat: latitud,
          lng: longitud,
          categoriaId: 'fijo',
          titulo,
          subtitulo: 'Ubicación exacta',
          icono: '',
        }}
        filtros={[]}
        puntos={[]}
        filtrosActivosIniciales={[]}
      />
    </div>
  );
}
