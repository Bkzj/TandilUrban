'use client';

import { useState, useEffect, Suspense } from 'react';
import PropertyCard from '@/components/PropertyCard';
import Navbar from '@/components/Navbar';
import SearchBox from '@/components/SearchBox';
import HeroColumn from '@/components/HeroColumn';
import { IMAGENES_HOME } from '@/constants/home';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

const FILTROS_HOME = [
  { id: 'Casa', nombre: 'Casas', icono: '🏡' },
  { id: 'Departamento', nombre: 'Departamentos', icono: '🏢' },
  { id: 'Lote', nombre: 'Lotes/Campos', icono: '🌳' },
];

// 1. Componente de Íconos Modernos (SVGs minimalistas)
const IconoModerno = ({ nombre }: { nombre: string }) => {
  const baseClasses = "w-8 h-8 text-white mb-4 opacity-90";
  switch (nombre) {
    case 'propiedades':
      return <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
    case 'destacados':
      return <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.114-1.059.83l-4.73-2.52a.568.568 0 00-.538 0l-4.73 2.52c-.528.284-1.207-.209-1.059-.83l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;
    case 'tasaciones':
      return <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
    case 'nosotros':
      return <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
    default: return null;
  }
};

const DATOS_COLUMNAS = [
  { id: 'propiedades', icono: <IconoModerno nombre="propiedades" />, titulo: ['PROPIEDADES'], fondo: IMAGENES_HOME.propiedades },
  { id: 'destacados', icono: <IconoModerno nombre="destacados" />, titulo: ['DESTACADOS'], fondo: IMAGENES_HOME.destacados },
  { id: 'tasaciones', icono: <IconoModerno nombre="tasaciones" />, titulo: ['TASACIONES'], fondo: IMAGENES_HOME.tasaciones },
  { id: 'nosotros', icono: <IconoModerno nombre="nosotros" />, titulo: ['NOSOTROS'], fondo: IMAGENES_HOME.nosotros, sinBorde: true },
];

// 2. Componente interno que maneja la lógica (Modularización)
function ContenidoHome() {
  const searchParams = useSearchParams();
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null);
  const [propiedades, setPropiedades] = useState<any[]>([]);

  useEffect(() => {
    const tipo = searchParams?.get('tipo');
    const operacion = searchParams?.get('operacion');
    const barrio = searchParams?.get('barrio'); // Agregamos la captura del barrio

    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (operacion) params.append('operacion', operacion);
    if (barrio) params.append('barrio', barrio); // Lo sumamos a la URL de la API

    fetch(`/api/propiedades?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPropiedades(data);
        } else {
          setPropiedades([]);
        }
      })
      .catch(err => {
        console.error("Error en el fetch:", err);
        setPropiedades([]);
      });
  }, [searchParams]);

  return (
    <>
      <Navbar />

      <section className="relative h-[80vh] w-full flex">
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${IMAGENES_HOME.default}')` }}></div>

        <div 
          className="relative z-10 w-full h-full flex flex-col md:flex-row pb-20"
          onMouseLeave={() => setColumnaActiva(null)} 
        >
          {DATOS_COLUMNAS.map((columna) => (
            <HeroColumn
              key={columna.id}
              // Asegurate que HeroColumn en sus props espere React.ReactNode para 'icono' en lugar de un 'string'
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

      <div className="relative z-20 -mt-24 px-4 w-full flex justify-center">
        <SearchBox />
      </div>

      <section className="w-full max-w-7xl mx-auto px-4 py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest mb-2">Oportunidades</h2>
            <p className="text-gray-500 font-light">Descubre las propiedades más exclusivas ingresadas esta semana.</p>
          </div>
          <button className="text-verde font-semibold uppercase tracking-wider text-sm hover:text-naranja transition-colors">
            Ver todas →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {propiedades?.map((prop) => (
            <PropertyCard
              key={prop.id}
              id={prop.id}
              titulo={prop.titulo}
              precio={prop.precio}
              moneda={prop.moneda}
              operacion={prop.operacion}
              ambientes={prop.ambientes}
              m2Total={prop.m2Total}
              esSustentable={prop.esSustentable}
              imagenUrl={prop.imagenes?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop"} 
            />
          ))}
        </div>
      </section>

      <section className="h-[50vh] w-full mt-12 relative z-0 border-t border-gray-300">
        <MapComponent 
          centro={[-37.32167, -59.13316]} 
          zoom={13}
          filtros={FILTROS_HOME}
          filtrosActivosIniciales={['Casa', 'Departamento', 'Lote']} 
          puntos={propiedades?.map(p => ({
            id: p.id,
            lat: p.latitud,
            lng: p.longitud,
            categoriaId: p.tipo,
            titulo: p.titulo,
            subtitulo: `${p.moneda} ${p.precio.toLocaleString('es-AR')}`,
            icono: p.tipo === 'Casa' ? '🏡' : p.tipo === 'Departamento' ? '🏢' : '🌳'
          }))}
        />
      </section>
    </>
  );
}

// 3. Exportación principal limpia, manejando la barrera de Suspense
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-100">
      <Suspense fallback={<div className="h-screen flex items-center justify-center font-sans tracking-widest uppercase text-gray-500">Cargando plataforma...</div>}>
        <ContenidoHome />
      </Suspense>
    </main>
  );
}