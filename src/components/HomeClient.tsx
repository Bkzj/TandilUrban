'use client';

import { useState, type ReactNode } from 'react';
import PropertyCard from '@/components/PropertyCard';
import Navbar from '@/components/Navbar';
import SearchBox from '@/components/SearchBox';
import HeroColumn from '@/components/HeroColumn';
import { IMAGENES_HOME } from '@/constants/home';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

const FILTROS_HOME = [
  { id: 'Casa', nombre: 'Casas', icono: '🏡' },
  { id: 'Departamento', nombre: 'Departamentos', icono: '🏢' },
  { id: 'Lote', nombre: 'Lotes/Campos', icono: '🌳' },
];

const IconoModerno = ({ nombre }: { nombre: string }) => {
  const baseClasses = 'mb-4 h-8 w-8 text-surface opacity-90';
  switch (nombre) {
    case 'propiedades':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case 'destacados':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.114-1.059.83l-4.73-2.52a.568.568 0 00-.538 0l-4.73 2.52c-.528.284-1.207-.209-1.059-.83l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case 'tasaciones':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'nosotros':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    default:
      return null;
  }
};

const DATOS_COLUMNAS = [
  { id: 'propiedades', icono: <IconoModerno nombre="propiedades" />, titulo: ['PROPIEDADES'], fondo: IMAGENES_HOME.propiedades },
  { id: 'destacados', icono: <IconoModerno nombre="destacados" />, titulo: ['DESTACADOS'], fondo: IMAGENES_HOME.destacados },
  { id: 'tasaciones', icono: <IconoModerno nombre="tasaciones" />, titulo: ['TASACIONES'], fondo: IMAGENES_HOME.tasaciones },
  { id: 'nosotros', icono: <IconoModerno nombre="nosotros" />, titulo: ['NOSOTROS'], fondo: IMAGENES_HOME.nosotros, sinBorde: true },
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

function ScrollRevealHeading({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 42 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px', amount: 0.3 }}
      transition={{ duration: 0.62, ease: easingReveal }}
    >
      {children}
    </motion.div>
  );
}

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

function PropsGridReveal({ propiedades }: { propiedades: HomePropiedadListItem[] }) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-6% 0px', amount: 0.12 }}
      className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      {propiedades.map((prop) => (
        <motion.div key={prop.id} variants={fadeSlideUpItem} layout>
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

type HomeClientProps = {
  propiedades: HomePropiedadListItem[];
};

export default function HomeClient({ propiedades }: HomeClientProps) {
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null);

  return (
    <>
      <Navbar />

      <section className="relative flex h-[80vh] w-full overflow-hidden">
        {/* Foto de fondo */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGENES_HOME.default}')` }}
        />
        {/* Gradiente tonal */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-verde-dark/90 via-verde-dark/62 to-verde-hover/42" />

        <div
          className="relative z-10 flex h-full w-full flex-col pb-20 md:flex-row"
          onMouseLeave={() => setColumnaActiva(null)}
        >
          {DATOS_COLUMNAS.map((columna) => (
            <HeroColumn
              key={columna.id}
              icono={columna.icono}
              lineasTitulo={columna.titulo}
              fondoImagen={columna.fondo}
              estaActiva={columnaActiva === columna.id}
              hayAlgunaActiva={columnaActiva !== null}
              onMouseEnter={() => setColumnaActiva(columna.id)}
              onMouseLeave={() => {}}
              tieneBordeRight={!columna.sinBorde}
            />
          ))}
        </div>
      </section>

      <div className="relative z-20 -mt-24 flex w-full justify-center px-4">
        <SearchBox />
      </div>

      <section id="oportunidades" className="mx-auto w-full max-w-7xl px-4 py-20">
        <ScrollRevealHeading>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold uppercase tracking-widest text-text-primary">Oportunidades</h2>
              <p className="font-light text-text-secondary">
                Descubre las propiedades más exclusivas ingresadas esta semana.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-semibold uppercase tracking-wider text-verde transition-colors hover:text-naranja"
            >
              Ver todas →
            </button>
          </div>
        </ScrollRevealHeading>

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
