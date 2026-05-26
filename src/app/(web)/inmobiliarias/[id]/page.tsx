import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Mail, Phone } from 'lucide-react';

import Navbar from '@/components/Navbar';
import { PropertyGrid } from '@/components/public/PropertyGrid';
import { buildWhatsAppUrl, getInmobiliariaProfile } from '@/lib/data/inmobiliaria-profile';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getInmobiliariaProfile(id);

  if (!profile) {
    return { title: 'Perfil no encontrado | Propea Group' };
  }

  const count = profile.propiedades.length;
  const listingHint =
    count === 1 ? '1 propiedad disponible' : `${count} propiedades disponibles`;

  return {
    title: `${profile.displayName} | Propea Group`,
    description: `Vidriera de ${profile.displayName} en Tandil. ${listingHint}.`,
    openGraph: {
      title: profile.displayName,
      description: listingHint,
    },
  };
}

export default async function InmobiliariaProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getInmobiliariaProfile(id);
  if (!profile) notFound();

  const count = profile.propiedades.length;
  const countLabel =
    count === 1 ? '1 propiedad' : `${count} propiedades`;

  const whatsappUrl = buildWhatsAppUrl(
    profile.telefono,
    `Hola ${profile.displayName}, vi tu perfil en Propea Group y me gustaría consultar.`,
  );

  const avatarSrc =
    profile.avatarUrl ??
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop';

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-gray-900">
      <Navbar />

      <header className="relative border-b border-gray-100 bg-gray-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(28 94 60 / 0.12) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <div className="flex flex-col items-center text-center">
            <div className="relative -mb-2 mt-2 h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg ring-1 ring-black/5 sm:h-36 sm:w-36">
              <Image
                src={avatarSrc}
                alt={profile.displayName}
                fill
                className="object-cover"
                sizes="144px"
                priority
              />
            </div>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-verde">
              {profile.rol === 'INMOBILIARIA' ? 'Inmobiliaria' : 'Agente comercial'}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {profile.displayName}
            </h1>
            {profile.subtitle ? (
              <p className="mt-2 text-base text-text-secondary">{profile.subtitle}</p>
            ) : null}

            <div className="mt-6 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-6">
              {profile.telefono ? (
                <a
                  href={`tel:${profile.telefono.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-verde"
                >
                  <Phone className="h-4 w-4 text-verde" aria-hidden />
                  {profile.telefono}
                </a>
              ) : null}
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-verde"
              >
                <Mail className="h-4 w-4 text-verde" aria-hidden />
                {profile.email}
              </a>
            </div>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#25D366] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-105"
              >
                Contactar por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Propiedades de {profile.displayName}
          </h2>
          <span className="inline-flex w-fit items-center rounded-full bg-verde-light px-4 py-1.5 text-sm font-semibold text-verde-dark">
            {countLabel}
          </span>
        </div>

        <PropertyGrid propiedades={profile.propiedades} />
      </section>
    </main>
  );
}
