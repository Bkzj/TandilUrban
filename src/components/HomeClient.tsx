'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import Navbar from '@/components/Navbar';
import HeroSearch from '@/components/public/HeroSearch';
import { HeroColumns } from '@/components/public/HeroColumns';
import { motion } from 'framer-motion';

import MapComponent from '@/components/Map';

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
  barrios: string[];
};

export default function HomeClient({ propiedades, barrios }: HomeClientProps) {
  return (
    <>
      <Navbar />

      <HeroColumns>
        <HeroSearch barrios={barrios} />
      </HeroColumns>

      <section id="oportunidades" className="mx-auto w-full max-w-7xl px-4 py-20">
        <ScrollRevealHeading>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold uppercase tracking-widest text-text-primary">Oportunidades</h2>
              <p className="font-light text-text-secondary">
                Descubre las propiedades más exclusivas ingresadas esta semana.
              </p>
            </div>
            <Link
              href="/buscar"
              className="text-sm font-semibold uppercase tracking-wider text-verde transition-colors hover:text-naranja"
            >
              Ver todas →
            </Link>
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
