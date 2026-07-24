import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Navbar from '@/components/Navbar';
import { FavoriteButton } from '@/components/public/FavoriteButton';
import { getServerAuthSession } from '@/lib/auth';
import { getPropiedadesSimilares } from '@/lib/data/propiedades-similares';
import { getFavoritePropiedadIds, isPropiedadFavorita } from '@/lib/favoritos';
import { prisma } from '@/lib/prisma';
import type { SessionUserAugmented } from '@/types/auth';
import { buildPropiedadOgImageUrl, getPropiedadOgData } from '@/lib/propiedad-og';
import { getPropiedadPublicDetail } from '@/lib/propiedad-public-detail';

import { PropertyGallery } from '@/components/propiedades/PropertyGallery';
import PropertyLocationSection from '@/components/public/PropertyLocationSection';
import { PropertyContactForm } from '@/components/public/PropertyContactForm';
import { PropertyPublisherCard } from '@/components/public/PropertyPublisherCard';
import { PropertyShareButton } from '@/components/public/PropertyShareButton';
import { PropiedadPageTracker } from '@/components/public/PropiedadPageTracker';
import { PropertyGrid } from '@/components/public/PropertyGrid';
import { RecentlyViewed } from '@/components/public/RecentlyViewed';
import ExpandableText from '@/components/public/ExpandableText';
import ExpandableAmenities from '@/components/public/ExpandableAmenities';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import type { RecentProperty } from '@/hooks/useRecentlyViewed';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const propiedad = await getPropiedadOgData(id);

  if (!propiedad) {
    return { title: 'Propiedad no encontrada | Propea Group' };
  }

  const ogUrl = new URL(buildPropiedadOgImageUrl(propiedad.id));

  return {
    title: `${propiedad.titulo} | Propea Group`,
    description: propiedad.descripcionResumen,
    openGraph: {
      title: propiedad.titulo,
      description: propiedad.descripcionResumen,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default async function PropiedadPage({ params }: PageProps) {
  const { id } = await params;
  const propiedad = await getPropiedadPublicDetail(id);
  if (!propiedad) notFound();

  const session = await getServerAuthSession();
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;

  const [isFavoritoInicial, favoritoIds, propiedadesSimilares, agente] = await Promise.all([
    isPropiedadFavorita(userId, propiedad.id),
    userId ? getFavoritePropiedadIds(userId) : Promise.resolve(new Set<string>()),
    getPropiedadesSimilares(
      propiedad.id,
      propiedad.tipo,
      propiedad.operacion,
      propiedad.latitud,
      propiedad.longitud,
    ),
    propiedad.agenteId != null
      ? prisma.user.findUnique({
          where: { id: propiedad.agenteId },
          select: { id: true, nombre: true, avatarUrl: true },
        })
      : Promise.resolve(null),
  ]);

  const agenciaNombre = propiedad.inmobiliaria?.nombreAgencia ?? 'Agencia Independiente';
  const contactoComercial = agente?.nombre ?? 'Consultá con la agencia';
  const profileUserId = propiedad.agenteId ?? propiedad.inmobiliaria?.userId ?? null;
  const logoInmobiliaria =
    propiedad.inmobiliaria?.logoUrl ?? propiedad.inmobiliaria?.logoAgencia ?? null;
  const tieneAgente = agente != null;

  const precioFmt =
    propiedad.precio != null
      ? `${propiedad.moneda} ${propiedad.precio.toLocaleString('es-AR')}`
      : 'Valor a consultar';

  const operacionLabel = String(propiedad.operacion).toUpperCase();
  const tipoLabel = String(propiedad.tipo).toUpperCase();

  const direccionCompleta = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');

  const tieneUbicacion =
    Number.isFinite(propiedad.latitud) &&
    Number.isFinite(propiedad.longitud) &&
    !(propiedad.latitud === 0 && propiedad.longitud === 0);

  const imagenUrls = imagenesItemsToUrls(normalizePropiedadImagenesDb(propiedad.imagenes));
  const recentEntry: RecentProperty = {
    id: propiedad.id,
    titulo: propiedad.titulo,
    precio: precioFmt,
    tipoOperacion: operacionLabel,
    imagen: imagenUrls[0] ?? '',
  };

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-gray-900">
      <PropiedadPageTracker entry={recentEntry} />
      <Navbar />

      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* 1. Encabezado */}
        <header className="border-b border-gray-200 pb-6 sm:pb-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              {operacionLabel}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
              {tipoLabel}
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {propiedad.titulo}
            </h1>
            <PropertyShareButton title={propiedad.titulo} />
          </div>
          <p className="mt-3 text-xl font-semibold text-naranja sm:text-2xl">{precioFmt}</p>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">{direccionCompleta}</p>
        </header>

        <div className="relative">
          <PropertyGallery imagenes={propiedad.imagenes} />
          <FavoriteButton
            propiedadId={propiedad.id}
            isFavoritoInicial={isFavoritoInicial}
            className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"
          />
        </div>

        {/* Barra de métricas (debajo de la galería, encima del grid de 2 columnas) */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4 border-b border-gray-200 pb-6 sm:mt-8 sm:gap-x-10 sm:gap-y-6 sm:pb-8">
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

        {/* Cuerpo: 1 col móvil · 2+1 desktop */}
        <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-12 sm:gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="min-w-0 space-y-8 sm:space-y-12 lg:col-span-2">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Descripción</h2>
              <ExpandableText text={propiedad.descripcion ?? ''} />
            </section>

            {propiedad.caracteristicas.length > 0 ? (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Comodidades</h2>
                <ExpandableAmenities items={propiedad.caracteristicas} />
              </section>
            ) : null}

            {tieneUbicacion ? (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Ubicación</h2>
                <PropertyLocationSection
                  lat={propiedad.latitud}
                  lng={propiedad.longitud}
                  titulo={propiedad.titulo}
                />
              </section>
            ) : null}
          </div>

          <aside className="min-w-0 lg:col-span-1">
            <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg sm:space-y-8 sm:p-6 lg:sticky lg:top-24 lg:p-8">
              <PropertyPublisherCard
                profileHref={profileUserId ? `/inmobiliarias/${profileUserId}` : null}
                agenciaNombre={agenciaNombre}
                contactoNombre={contactoComercial}
                logoUrl={logoInmobiliaria}
                agenteAvatarUrl={agente?.avatarUrl ?? null}
                tieneAgente={tieneAgente}
              />
              <h3 className="mb-4 rounded-xl bg-naranja px-4 py-3 text-center text-xl font-bold text-white">
                ¿Te interesa esta propiedad?
              </h3>
              <PropertyContactForm propiedadId={propiedad.id} />
            </div>
          </aside>
        </div>

        {propiedadesSimilares.length > 0 ? (
          <section className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16">
            <h2 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
              También te podría interesar
            </h2>
            <PropertyGrid propiedades={propiedadesSimilares} favoritoIds={favoritoIds} />
          </section>
        ) : null}

        <RecentlyViewed excludeId={propiedad.id} />
      </div>
    </main>
  );
}
