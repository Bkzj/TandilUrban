// src/app/(web)/propiedades/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

// 1. Un solo import dinámico del mapa
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

// 2. Una sola definición de los filtros
const FILTROS_POI = [
  { id: 'escuelas', nombre: 'Escuelas', icono: '🏫' },
  { id: 'hospitales', nombre: 'Salud', icono: '🏥' },
  { id: 'supermercados', nombre: 'Súper', icono: '🛒' },
  { id: 'policia', nombre: 'Policía', icono: '🚓' },
  { id: 'colectivos', nombre: 'Transporte', icono: '🚌' },
];

// 3. Generador de puntos de interés simulados
const generarPOIs = (lat: number, lng: number) => {
  const puntos = [];
  for (const filtro of FILTROS_POI) {
    for (let i = 0; i < 2; i++) {
      puntos.push({
        id: `${filtro.id}-${i}`,
        lat: lat + (Math.random() - 0.5) * 0.015,
        lng: lng + (Math.random() - 0.5) * 0.015,
        categoriaId: filtro.id,
        titulo: `${filtro.nombre} Cercano`,
        icono: filtro.icono
      });
    }
  }
  return puntos;
};

export default function DetallePropiedad() {
  const params = useParams();
  const id = params?.id;

  const [prop, setProp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/propiedades/${id}`)
      .then(res => res.json())
      .then(data => {
        setProp(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("❌ Error grave de conexión:", error);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background font-sans uppercase tracking-widest text-text-secondary">Cargando detalles...</div>;
  if (!prop || prop.error) return <div className="flex h-screen flex-col items-center justify-center bg-background font-sans"><span className="mb-2 text-xl font-bold text-naranja-dark">Propiedad no encontrada.</span><span className="text-text-secondary">Revisa la consola para más detalles.</span></div>;

  return (
    <main className="min-h-screen bg-background pb-20 font-sans">
      <Navbar />

      {/* Hero Image / Gallery */}
      <section className="relative h-[60vh] w-full overflow-hidden bg-verde-dark">
        <img 
          src={prop.imagenes?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop"} 
          alt={prop.titulo} 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-text-primary/70 to-transparent"></div>
        <div className="absolute bottom-10 left-10 text-surface">
          <div className="flex gap-2 mb-4">
             <span className="rounded-full bg-verde px-4 py-1 text-xs font-bold uppercase">{prop.operacion}</span>
             {prop.esSustentable && <span className="rounded-full bg-verde-hover px-4 py-1 text-xs font-bold uppercase">🌱 Sustentable</span>}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-2">{prop.titulo}</h1>
          <p className="text-2xl font-light text-naranja">
            {prop.precio ? `${prop.moneda} ${prop.precio.toLocaleString('es-AR')}` : 'Valor a consultar'}
          </p>        
         </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Columna Izquierda: Información */}
        <div className="lg:col-span-2">
          {/* AQUÍ SE CORRIGIÓ EL TAMAÑO Y COLOR DE LOS TEXTOS */}
          <div className="mb-10 flex flex-wrap gap-8 rounded-3xl border border-border-light bg-surface p-8">
            <div className="flex flex-col"><span className="mb-1 text-xs font-bold uppercase text-text-secondary">Dormitorios</span><span className="text-2xl font-bold text-text-primary">🛏️ {prop.dormitorios}</span></div>
            <div className="flex flex-col"><span className="mb-1 text-xs font-bold uppercase text-text-secondary">Baños</span><span className="text-2xl font-bold text-text-primary">🚿 {prop.banos}</span></div>
            <div className="flex flex-col"><span className="mb-1 text-xs font-bold uppercase text-text-secondary">Superficie</span><span className="text-2xl font-bold text-text-primary">📐 {prop.m2Total} m²</span></div>
            <div className="flex flex-col"><span className="mb-1 text-xs font-bold uppercase text-text-secondary">Antigüedad</span><span className="text-2xl font-bold text-text-primary">⏳ {prop.antiguedadAnos} años</span></div>
          </div>

          <h3 className="mb-6 text-2xl font-bold text-text-primary">Descripción</h3>
          <p className="mb-10 text-lg leading-relaxed text-text-secondary">{prop.descripcion}</p>

          <h3 className="mb-6 text-2xl font-bold text-text-primary">Comodidades e Instalaciones</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {prop.comodidades?.map((item: string, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-border-light bg-surface px-4 py-2 text-text-secondary">
                <span className="text-verde">✓</span> {item}
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Formulario de Contacto (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl border border-border-light bg-surface p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-bold text-text-primary">¿Te interesa esta propiedad?</h3>
            <form className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Tu nombre" 
                className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde" 
              />
              <input 
                type="email" 
                placeholder="Tu email" 
                className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde" 
              />
              <textarea 
                placeholder="Hola, me gustaría recibir más información..." 
                rows={4} 
                className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde"
              ></textarea>
              <button className="w-full rounded-xl bg-verde py-4 font-bold text-surface shadow-lg transition-all hover:bg-verde-hover">
                Enviar Consulta
              </button>
            </form>
          </div>
        </div>

      </section>
      
      {/* SECCIÓN: MAPA DE ENTORNO */}
      <section className="relative z-0 mt-12 h-[60vh] w-full border-t border-border-light">
        <MapComponent 
          centro={[prop.latitud, prop.longitud]} 
          zoom={14}
          marcadorFijo={{
            id: prop.id,
            lat: prop.latitud,
            lng: prop.longitud,
            categoriaId: 'fijo',
            titulo: prop.titulo,
            subtitulo: 'Ubicación Exacta',
            icono: '📍'
          }}
          filtros={FILTROS_POI}
          filtrosActivosIniciales={[]} 
          puntos={generarPOIs(prop.latitud, prop.longitud)} 
        />
      </section>
    </main>
  );
}