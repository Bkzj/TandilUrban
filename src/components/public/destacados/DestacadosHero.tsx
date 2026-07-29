'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Home, Sparkles, Star, TrendingUp } from 'lucide-react';

import {
  EDITORIAL_FADE_UP,
  EditorialHeroCollage,
  EditorialPortalHero,
  fillEditorialImages,
} from '@/components/public/EditorialPortalHero';
import { IMAGENES_HOME } from '@/constants/home';

const PILARES = [
  { icon: Home, label: 'Casas' },
  { icon: Building2, label: 'Deptos' },
  { icon: TrendingUp, label: 'Top visitas' },
  { icon: Star, label: 'Exclusivas' },
] as const;

type Props = {
  totalItems: number;
  showcaseImages: string[];
};

export function DestacadosHero({ totalItems, showcaseImages }: Props) {
  const cards = fillEditorialImages(showcaseImages, [
    IMAGENES_HOME.destacados,
    IMAGENES_HOME.propiedades,
    IMAGENES_HOME.tasaciones,
  ]);

  return (
    <EditorialPortalHero
      borderClassName="border-naranja/20"
      scrollHref="#oportunidades"
      scrollLabel="Ir a la selección destacada"
      background={
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${IMAGENES_HOME.destacados}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-naranja-dark/88 to-verde/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(149,115,39,0.22),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
        </>
      }
      decorations={
        <>
          <div
            className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-naranja/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-verde/30 blur-3xl"
            aria-hidden
          />
        </>
      }
      content={
        <>
          <motion.div variants={EDITORIAL_FADE_UP}>
            <span className="inline-flex items-center gap-2 rounded-full border border-naranja-light/40 bg-naranja/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-naranja-light backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-naranja-light" aria-hidden />
              Selección exclusiva
            </span>
          </motion.div>
          <motion.h1
            variants={EDITORIAL_FADE_UP}
            className="mt-6 text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white"
          >
            <span className="block">Propiedades</span>
            <span className="mt-1 block bg-gradient-to-r from-naranja-light via-white to-emerald-200 bg-clip-text text-transparent">
              destacadas
            </span>
          </motion.h1>
          <motion.p
            variants={EDITORIAL_FADE_UP}
            className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0"
          >
            Las mejores oportunidades del mercado tandilense, curadas por interés real de
            compradores y la calidad de cada publicación.
          </motion.p>
          {totalItems > 0 ? (
            <motion.p
              variants={EDITORIAL_FADE_UP}
              className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-naranja-light/95"
            >
              {totalItems === 1
                ? '1 propiedad en la selección'
                : `${totalItems} propiedades en la selección`}
            </motion.p>
          ) : null}
          <motion.div
            variants={EDITORIAL_FADE_UP}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href="#oportunidades"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-naranja px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-naranja/25 transition hover:bg-naranja-hover"
            >
              Explorar selección
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Ver todas las propiedades
            </Link>
          </motion.div>
          <motion.div
            variants={EDITORIAL_FADE_UP}
            className="mt-10 grid grid-cols-4 gap-2 sm:gap-3 lg:max-w-md"
          >
            {PILARES.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-sm sm:px-3"
              >
                <Icon
                  className={`mx-auto h-4 w-4 sm:h-5 sm:w-5 ${
                    index % 2 === 0 ? 'text-naranja-light' : 'text-emerald-200'
                  }`}
                  aria-hidden
                />
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
          cardClassName={(index) =>
            index === 1 ? 'ring-naranja-light/50' : 'ring-white/20'
          }
          renderOverlay={() => (
            <span className="absolute left-2 top-2 rounded-full bg-naranja px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white shadow-sm">
              Destacada
            </span>
          )}
        />
      }
      footer={
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 text-center sm:px-6">
          <p className="text-xs font-medium text-naranja-light/90 sm:text-sm">
            <span className="font-bold text-white">Curadas por Propea Group</span> — calidad y engagement
          </p>
          <span className="hidden h-4 w-px bg-naranja-light/30 sm:block" aria-hidden />
          <p className="text-xs font-medium text-emerald-100/90 sm:text-sm">
            <span className="font-bold text-white">Fichas reales</span> — fotos, precio y contacto
          </p>
        </div>
      }
    />
  );
}
