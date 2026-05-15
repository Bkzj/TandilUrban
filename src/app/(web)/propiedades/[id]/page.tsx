import { notFound } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Waves,
  UtensilsCrossed,
  Car,
  TreePine,
  Shield,
  Sun,
  Snowflake,
  Check,
} from 'lucide-react';

import Navbar from '@/components/Navbar';
import { prisma } from '@/lib/prisma';

import { PropertyGallery } from '@/components/propiedades/PropertyGallery';
import { PropiedadUbicacionMap } from '@/components/propiedades/PropiedadUbicacionMap';

import { PropiedadContactoForm } from './PropiedadContactoForm';

const iconMap: Record<string, LucideIcon> = {
  Piscina: Waves,
  Quincho: UtensilsCrossed,
  Cochera: Car,
  Jardín: TreePine,
  Seguridad: Shield,
  Balcón: Sun,
  'Aire acondicionado': Snowflake,
};

function ComodidadIcon({ label }: { label: string }) {
  const Icon = iconMap[label] ?? Check;
  return <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function PropiedadPage({ params }: PageProps) {
  const { id } = await params;
  const propiedad = await prisma.propiedad.findUnique({
    where: { id },
    include: { inmobiliaria: true },
  });
  if (!propiedad) notFound();

  const agente =
    propiedad.agenteId != null
      ? await prisma.user.findUnique({
          where: { id: propiedad.agenteId },
          select: { nombre: true },
        })
      : null;

  const agenciaNombre = propiedad.inmobiliaria?.nombreAgencia ?? 'Agencia Independiente';
  const contactoComercial = agente?.nombre ?? 'Consultá con la agencia';

  const precioFmt =
    propiedad.precio != null
      ? `${propiedad.moneda} ${propiedad.precio.toLocaleString('es-AR')}`
      : 'Valor a consultar';

  const operacionLabel = String(propiedad.operacion).toUpperCase();
  const tipoLabel = String(propiedad.tipo).toUpperCase();

  const direccionCompleta = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-gray-900">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* 1. Encabezado */}
        <header className="border-b border-gray-200 pb-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              {operacionLabel}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
              {tipoLabel}
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-gray-900">{propiedad.titulo}</h1>
          <p className="mt-3 text-2xl font-semibold text-naranja">{precioFmt}</p>
          <p className="mt-2 text-base text-gray-500">{direccionCompleta}</p>
        </header>

        <PropertyGallery imagenes={propiedad.imagenes} />

        {/* Barra de métricas (debajo de la galería, encima del grid de 2 columnas) */}
        <div className="mt-8 flex flex-wrap gap-x-10 gap-y-6 border-b border-gray-200 pb-8">
          <div className="flex min-w-[4.5rem] flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Dormitorios</span>
            <span className="text-2xl font-semibold text-gray-900">{propiedad.dormitorios}</span>
          </div>
          <div className="flex min-w-[4.5rem] flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Baños</span>
            <span className="text-2xl font-semibold text-gray-900">{propiedad.banos}</span>
          </div>
          <div className="flex min-w-[4.5rem] flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Cocheras</span>
            <span className="text-2xl font-semibold text-gray-900">{propiedad.cocheras}</span>
          </div>
          <div className="flex min-w-[5rem] flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Superficie</span>
            <span className="text-2xl font-semibold text-gray-900">{propiedad.m2Total} m²</span>
          </div>
          <div className="flex min-w-[4.5rem] flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Ambientes</span>
            <span className="text-2xl font-semibold text-gray-900">{propiedad.ambientes}</span>
          </div>
        </div>

        {/* Cuerpo: 2 columnas */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-12 lg:col-span-2">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Descripción</h2>
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
                {propiedad.descripcion}
              </p>
            </section>

            {propiedad.caracteristicas.length > 0 ? (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Comodidades</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {propiedad.caracteristicas.map((c) => (
                    <div
                      key={c}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm"
                    >
                      <ComodidadIcon label={c} />
                      <span className="text-sm font-medium">{c}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Ubicación</h2>
              <PropiedadUbicacionMap
                propiedadId={propiedad.id}
                titulo={propiedad.titulo}
                latitud={propiedad.latitud}
                longitud={propiedad.longitud}
              />
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Inmobiliaria</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">{agenciaNombre}</p>
              <p className="mt-6 text-xs font-bold uppercase tracking-wide text-gray-500">
                Contacto comercial
              </p>
              <p className="mt-1 font-semibold text-gray-900">{contactoComercial}</p>
              <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">¿Te interesa esta propiedad?</h3>
              <PropiedadContactoForm propiedadId={propiedad.id} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
