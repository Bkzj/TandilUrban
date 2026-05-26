'use client';

import PropertyCard from '@/components/PropertyCard';
import MapComponent from '@/components/Map';
import { motion } from 'framer-motion';

export type HomePropiedadListItem = {
  id: string;
  titulo: string;
  precio: number;
  moneda: string;
  operacion: string;
  ambientes: number;
  m2Total: number;
  latitud: number;
  longitud: number;
  tipo: string;
  imagenes: string[];
  esSustentable: boolean;
};


const FILTROS_HOME = [
  { id: 'Casa', nombre: 'Casas', icono: '🏡' },
  { id: 'Departamento', nombre: 'Departamentos', icono: '🏢' },
  { id: 'Lote', nombre: 'Lotes/Campos', icono: '🌳' },
];

const easingReveal = [0.22, 1, 0.36, 1] as const;

const staggerParent = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.088,
      delayChildren: 0.04,
    },
  },
};

const fadeSlideUpItem = {
  hidden: { opacity: 0, y: 44 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: easingReveal },
  },
};

function PropsGridReveal({ propiedades }: { propiedades: HomePropiedadListItem[] }) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-6% 0px', amount: 0.12 }}
      className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {propiedades.map((prop, index) => (
        <motion.div
          key={prop.id}
          variants={fadeSlideUpItem}
          layout
          className={`w-full min-w-0 ${index >= 4 ? 'hidden md:block' : ''}`}
        >
          <PropertyCard
            id={prop.id}
            titulo={prop.titulo}
            precio={prop.precio}
            moneda={prop.moneda}
            operacion={prop.operacion}
            ambientes={prop.ambientes}
            m2Total={prop.m2Total}
            esSustentable={prop.esSustentable}
            imagenUrl={
              prop.imagenes[0] ||
              'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop'
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

type HomeListingsProps = {
  propiedades: HomePropiedadListItem[];
};

export function HomeListings({ propiedades }: HomeListingsProps) {
  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 md:px-6 md:pt-8">
        <PropsGridReveal propiedades={propiedades} />
      </section>

      <section className="relative z-0 mt-12 h-[50vh] w-full border-t border-border-light">
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
            subtitulo: `${p.moneda} ${p.precio.toLocaleString('es-AR')}`,
            icono: p.tipo === 'Casa' ? '🏡' : p.tipo === 'Departamento' ? '🏢' : '🌳',
          }))}
        />
      </section>
    </>
  );
}
