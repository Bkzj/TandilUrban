'use client';

import MapComponent from '@/components/Map';
import type { PublicPropiedadListItem } from '@/types/public-search';
import { formatMoney } from '@/lib/money-format';

const FILTROS_HOME = [
  { id: 'Casa', nombre: 'Casas', icono: '🏡' },
  { id: 'Departamento', nombre: 'Departamentos', icono: '🏢' },
  { id: 'Lote', nombre: 'Lotes/Campos', icono: '🌳' },
];

type Props = {
  propiedades: PublicPropiedadListItem[];
};

export function HomeMapSection({ propiedades }: Props) {
  return (
    <section className="relative z-0 h-[50vh] w-full border-t border-border-light bg-gray-50">
      <MapComponent
        centro={[-37.32167, -59.13316]}
        zoom={13}
        filtros={FILTROS_HOME}
        filtrosActivosIniciales={['Casa', 'Departamento', 'Lote']}
        puntos={propiedades.map((p) => ({
          id: p.id,
          lat: p.latitud,
          lng: p.longitud,
          categoriaId: p.tipo,
          titulo: p.titulo,
          subtitulo: formatMoney(p.precio, p.moneda),
          icono: p.tipo === 'Casa' ? '🏡' : p.tipo === 'Departamento' ? '🏢' : '🌳',
        }))}
      />
    </section>
  );
}
