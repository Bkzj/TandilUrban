'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Star, Store, Users } from 'lucide-react';

import {
  EDITORIAL_FADE_UP,
  EditorialHeroCollage,
  EditorialPortalHero,
  fillEditorialImages,
} from '@/components/public/EditorialPortalHero';
import { IMAGENES_HOME } from '@/constants/home';

const PILARES = [
  { icon: Users, label: 'Equipos' },
  { icon: Store, label: 'Vidriera' },
  { icon: MapPin, label: 'Tandil' },
  { icon: Star, label: 'Destacadas' },
] as const;

const HERO_BG =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2000&auto=format&fit=crop';

type Props = {
  totalAgencias: number;
  showcaseImages: string[];
};

export function InmobiliariasHero({ totalAgencias, showcaseImages }: Props) {
  const cards = fillEditorialImages(showcaseImages, [
    IMAGENES_HOME.nosotros,
    IMAGENES_HOME.propiedades,
    IMAGENES_HOME.tasaciones,
  ]);

  return (
    <EditorialPortalHero
      borderClassName="border-verde/15"
      scrollHref="#inmobiliarias"
      scrollLabel="Ir al directorio de inmobiliarias"
      background={
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_BG}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/92 to-emerald-900/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
        </>
      }
      decorations={
        <>
          <div
            className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-verde/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-naranja/10 blur-3xl"
            aria-hidden
          />
        </>
      }
      content={
        <>
          <motion.div variants={EDITORIAL_FADE_UP}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Red Propea Group
            </span>
          </motion.div>
          <motion.h1
            variants={EDITORIAL_FADE_UP}
            className="mt-6 text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white"
          >
            <span className="block">Inmobiliarias</span>
            <span className="mt-1 block bg-gradient-to-r from-emerald-200 via-white to-emerald-200 bg-clip-text text-transparent">
              en Tandil
            </span>
          </motion.h1>
          <motion.p
            variants={EDITORIAL_FADE_UP}
            className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0"
          >
            Elegí la agencia que mejor se adapte a tu búsqueda. Cada perfil con equipo, contacto
            directo y vidriera profesional.
          </motion.p>
          {totalAgencias > 0 ? (
            <motion.p
              variants={EDITORIAL_FADE_UP}
              className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200/90"
            >
              {totalAgencias === 1
                ? '1 agencia en la red'
                : `${totalAgencias} agencias en la red`}
            </motion.p>
          ) : null}
          <motion.div
            variants={EDITORIAL_FADE_UP}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href="#inmobiliarias"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-black/20 transition hover:bg-emerald-50"
            >
              Ver agencias
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Buscar propiedades
            </Link>
          </motion.div>
          <motion.div
            variants={EDITORIAL_FADE_UP}
            className="mt-10 grid grid-cols-4 gap-2 sm:gap-3 lg:max-w-md"
          >
            {PILARES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-sm sm:px-3"
              >
                <Icon className="mx-auto h-4 w-4 text-emerald-200 sm:h-5 sm:w-5" aria-hidden />
                <p className="mt-1.5 text-[0.65rem] font-semibold leading-tight text-white/90 sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </>
      }
      visual={
        <EditorialHeroCollage
          images={cards}
          renderOverlay={() => (
            <span className="absolute left-2 top-2 rounded-full bg-verde px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white">
              Partner
            </span>
          )}
        />
      }
      footer={
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 text-center sm:px-6">
          <p className="text-xs font-medium text-emerald-100/90 sm:text-sm">
            <span className="font-bold text-white">Perfiles profesionales</span> — logo, bio y contacto
          </p>
          <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
          <p className="text-xs font-medium text-emerald-100/90 sm:text-sm">
            <span className="font-bold text-white">Vidriera digital</span> — stock y equipo visible
          </p>
        </div>
      }
    />
  );
}
