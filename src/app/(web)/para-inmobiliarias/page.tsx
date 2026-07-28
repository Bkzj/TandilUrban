import type { Metadata } from 'next';
import Link from 'next/link';
import { Share2, Store, TrendingUp } from 'lucide-react';

import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Para Inmobiliarias | Propea Group',
  description:
    'Sumá tu inmobiliaria a Propea Group: métricas medidas, Open Graph para WhatsApp y vidriera digital B2B.',
};

const DEMO_MAILTO =
  'mailto:contacto@propeagroup.com?subject=Solicitud%20de%20Demo%20Propea%20Group&body=Hola%2C%20quiero%20conocer%20Propea%20Group%20para%20mi%20inmobiliaria.';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Analytics en Tiempo Real',
    description:
      'Dashboard con embudo de conversión, precio por m² por zona, ranking de fichas y tasas de conversión de tu cartera.',
  },
  {
    icon: Share2,
    title: 'Viralidad en WhatsApp',
    description:
      'Cada propiedad genera automáticamente una tarjeta Open Graph optimizada para compartir en WhatsApp y redes.',
  },
  {
    icon: Store,
    title: 'Tu Vidriera Digital',
    description:
      'Perfil B2B personalizado para tu inmobiliaria y agentes, con logo, contacto y listado público de stock.',
  },
] as const;

export default function ParaInmobiliariasPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-emerald-950 text-white">
        <div
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598902108859-1b9f1656c2c7?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/95 to-emerald-900/80"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-28 lg:py-32">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/90">
            Solución B2B · Propea Group
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Llevá tu Inmobiliaria al próximo nivel.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 sm:text-xl">
            El portal de Tandil con inteligencia de mercado medida, paneles por período y SEO
            optimizado para WhatsApp.
          </p>
          <a
            href={DEMO_MAILTO}
            className="mt-10 inline-flex items-center justify-center rounded-xl bg-verde px-8 py-4 text-base font-semibold text-white shadow-lg shadow-verde/30 transition-colors hover:bg-verde-hover"
          >
            Solicitar Demo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Herramientas pensadas para vender más
            </h2>
            <p className="mt-3 text-gray-600">
              Todo lo que construimos en el panel profesional, ahora al servicio de tu agencia.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-verde-light text-verde">
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-verde py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-xl font-semibold leading-relaxed sm:text-2xl">
            No pierdas más clientes. Sumate a Propea Group, la red inmobiliaria más moderna de
            la ciudad.
          </p>
          <Link
            href={DEMO_MAILTO}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-verde shadow-md transition-colors hover:bg-gray-50"
          >
            Contactanos hoy
          </Link>
        </div>
      </section>
    </div>
  );
}
