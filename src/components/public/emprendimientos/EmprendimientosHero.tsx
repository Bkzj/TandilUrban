'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Store,
  TrendingUp,
} from 'lucide-react';

import { IMAGENES_HOME } from '@/constants/home';

const EASE = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

const fadeIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.85, ease: EASE } },
};

const PILARES = [
  { icon: Building2, label: 'En pozo' },
  { icon: Store, label: 'Locales' },
  { icon: TrendingUp, label: 'Franquicias' },
] as const;

const CARD_LAYOUT = [
  { className: 'left-[4%] top-[8%] z-20 w-[46%] -rotate-6', delay: 0 },
  { className: 'right-[2%] top-[28%] z-30 w-[52%] rotate-3', delay: 0.4 },
  { className: 'bottom-[10%] left-[18%] z-10 w-[44%] -rotate-2', delay: 0.8 },
] as const;

type Props = {
  totalItems: number;
  showcaseImages: string[];
};

function padImages(images: string[]): string[] {
  const fallback = [
    IMAGENES_HOME.tasaciones,
    IMAGENES_HOME.destacados,
    IMAGENES_HOME.propiedades,
    IMAGENES_HOME.nosotros,
  ];
  const out = [...images];
  for (const src of fallback) {
    if (out.length >= 3) break;
    if (!out.includes(src)) out.push(src);
  }
  return out.slice(0, 3);
}

export function EmprendimientosHero({ totalItems, showcaseImages }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const collageY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);

  const cards = padImages(showcaseImages);

  return (
    <header
      ref={sectionRef}
      className="relative flex min-h-[75vh] flex-col overflow-hidden border-b border-verde/15"
    >
      <motion.div className="absolute inset-0" style={{ y: bgY }} aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGENES_HOME.tasaciones}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-verde-dark/92 to-verde/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
      </motion.div>

      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-naranja/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-verde/30 blur-3xl"
        aria-hidden
      />

      <motion.div
        className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:flex-row lg:items-center lg:gap-8 lg:pb-12"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <motion.div
          className="relative z-10 flex flex-1 flex-col justify-center text-center lg:max-w-[46%] lg:text-left"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100 backdrop-blur-sm">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              Invertí · Emprendé · Crecé
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white"
          >
            <span className="block">Emprendimientos</span>
            <span className="mt-1 block bg-gradient-to-r from-emerald-200 via-white to-naranja-light bg-clip-text text-transparent">
              en Tandil
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0"
          >
            Portal informativo y propiedades reales en un solo espacio: pozo, locales
            y franquicias para tu próximo negocio.
          </motion.p>

          {totalItems > 0 ? (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200/90"
            >
              {totalItems} oportunidades activas
            </motion.p>
          ) : null}

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="#oportunidades"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-verde-dark shadow-lg shadow-black/20 transition hover:bg-verde-light"
            >
              Explorar oportunidades
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Ver propiedades
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 lg:max-w-md"
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
        </motion.div>

        <motion.div
          className="relative mt-10 min-h-[280px] flex-1 sm:min-h-[340px] lg:mt-0 lg:min-h-[420px]"
          style={{ y: collageY }}
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <div
            className="absolute inset-0 rounded-[2rem] bg-white/5 backdrop-blur-sm lg:rounded-[2.5rem]"
            style={{
              clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
            }}
            aria-hidden
          />

          <div className="relative mx-auto h-full max-w-md lg:max-w-none lg:min-h-[420px]">
            {cards.map((src, index) => {
              const layout = CARD_LAYOUT[index];
              if (!layout) return null;
              return (
                <motion.div
                  key={src}
                  variants={fadeIn}
                  className={`absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/35 ring-2 ring-white/20 ${layout.className}`}
                >
                  <motion.div
                    className="relative"
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 4.5 + layout.delay,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: layout.delay,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/5] w-full object-cover" />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                      aria-hidden
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 border-t border-white/10 bg-black/15 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.6, ease: EASE }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 text-center sm:px-6">
          <p className="text-xs font-medium text-emerald-100/90 sm:text-sm">
            <span className="font-bold text-white">Portal informativo</span> — dossiers y franquicias
          </p>
          <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
          <p className="text-xs font-medium text-emerald-100/90 sm:text-sm">
            <span className="font-bold text-white">Fichas reales</span> — pozo y locales con contacto
          </p>
        </div>
      </motion.div>

      <motion.a
        href="#oportunidades"
        className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-white/70 transition hover:text-white lg:bottom-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { delay: 1.1, duration: 0.5 },
          y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 },
        }}
        aria-label="Ir a las oportunidades"
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">Scroll</span>
        <ChevronDown className="h-5 w-5" aria-hidden />
      </motion.a>
    </header>
  );
}
