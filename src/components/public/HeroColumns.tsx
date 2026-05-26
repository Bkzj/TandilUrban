'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Building2, ChevronDown, Home, Star, Users, type LucideIcon } from 'lucide-react';

import { HERO_VIDEO_SRC, HERO_VIDEO_STILL, IMAGENES_HOME } from '@/constants/home';

const MOBILE_CATEGORIES: {
  id: string;
  titulo: string;
  icono: LucideIcon;
  imagen: string;
  href: string;
}[] = [
  {
    id: 'propiedades',
    titulo: 'Propiedades',
    icono: Home,
    imagen: IMAGENES_HOME.propiedades,
    href: '/buscar',
  },
  {
    id: 'destacados',
    titulo: 'Destacados',
    icono: Star,
    imagen: IMAGENES_HOME.destacados,
    href: '/destacados',
  },
  {
    id: 'emprendimientos',
    titulo: 'Emprendimientos',
    icono: Building2,
    imagen: IMAGENES_HOME.tasaciones,
    href: '/emprendimientos',
  },
  {
    id: 'inmobiliarias',
    titulo: 'Inmobiliarias',
    icono: Users,
    imagen: IMAGENES_HOME.nosotros,
    href: '/inmobiliarias',
  },
] as const;

/** Misma intensidad que el texto: legibilidad sobre video sin oscurecer el hero. */
const HERO_COLUMN_TEXT_SHADOW =
  '[text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.4)]';
const HERO_COLUMN_ICON_SHADOW =
  '[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.55))_drop-shadow(0_2px_10px_rgba(0,0,0,0.4))]';

const IconoModerno = ({ nombre }: { nombre: string }) => {
  const baseClasses = 'h-10 w-10 text-white md:h-12 md:w-12';
  switch (nombre) {
    case 'propiedades':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case 'destacados':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.114-1.059.83l-4.73-2.52a.568.568 0 00-.538 0l-4.73 2.52c-.528.284-1.207-.209-1.059-.83l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case 'emprendimientos':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'inmobiliarias':
      return (
        <svg className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    default:
      return null;
  }
};

const COLUMNAS = [
  {
    id: 'propiedades',
    icono: <IconoModerno nombre="propiedades" />,
    titulo: ['PROPIEDADES'],
    fondo: IMAGENES_HOME.propiedades,
    href: '/buscar',
  },
  {
    id: 'destacados',
    icono: <IconoModerno nombre="destacados" />,
    titulo: ['DESTACADOS'],
    fondo: IMAGENES_HOME.destacados,
    href: '/destacados',
  },
  {
    id: 'emprendimientos',
    icono: <IconoModerno nombre="emprendimientos" />,
    titulo: ['EMPRENDIMIENTOS'],
    fondo: IMAGENES_HOME.tasaciones,
    href: '/emprendimientos',
  },
  {
    id: 'inmobiliarias',
    icono: <IconoModerno nombre="inmobiliarias" />,
    titulo: ['INMOBILIARIAS'],
    fondo: IMAGENES_HOME.nosotros,
    href: '/inmobiliarias',
  },
] as const;

type HeroColumnsProps = {
  children: ReactNode;
};

function HeroMobile({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col bg-background md:hidden">
      <div className="grid w-full grid-cols-2 gap-0">
        {MOBILE_CATEGORIES.map((cat) => {
          const Icon = cat.icono;
          return (
            <Link
              key={cat.id}
              href={cat.href}
              className="group block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-verde"
            >
              <div className="relative aspect-square w-full overflow-hidden group">
                <Image
                  src={cat.imagen}
                  alt={cat.titulo}
                  fill
                  sizes="50vw"
                  priority={cat.id === 'propiedades' || cat.id === 'destacados'}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"
                  aria-hidden
                />
                <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-white">
                  <Icon className="h-5 w-5 drop-shadow-sm" strokeWidth={2} aria-hidden />
                  <span className="text-sm font-semibold drop-shadow-sm">{cat.titulo}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="relative z-10 bg-gray-50/50 px-4 pb-6 pt-6">{children}</div>
    </div>
  );
}

function HeroDesktop({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoBroken, setVideoBroken] = useState(false);

  useEffect(() => {
    if (videoBroken) return;
    const el = videoRef.current;
    if (!el) return;
    const kick = () => {
      void el.play().catch(() => {});
    };
    el.addEventListener('loadeddata', kick);
    el.addEventListener('canplay', kick);
    kick();
    return () => {
      el.removeEventListener('loadeddata', kick);
      el.removeEventListener('canplay', kick);
    };
  }, [videoBroken]);

  return (
    <section className="relative flex h-[75vh] w-full flex-col overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${HERO_VIDEO_STILL}')` }}
        aria-hidden
      />
      {!videoBroken ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
          src={HERO_VIDEO_SRC}
          poster={HERO_VIDEO_STILL}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setVideoBroken(true)}
          aria-hidden
        />
      ) : null}

      {/* Columnas a altura completa del hero (de arriba a abajo) */}
      <div className="absolute inset-0 z-10 flex flex-row">
        {COLUMNAS.map((col) => (
          <Link
            key={col.id}
            href={col.href}
            className="group relative flex h-full min-h-0 flex-1 cursor-pointer flex-col overflow-hidden border-r border-white/10 transition-[flex] duration-500 ease-out last:border-r-0 hover:flex-[1.5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
          >
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-cover bg-center bg-no-repeat opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ backgroundImage: `url('${col.fondo}')` }}
              aria-hidden
            />

            <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-4 pb-28 text-center md:pb-32">
              <span
                className={`mb-5 inline-flex scale-100 transition-transform duration-500 group-hover:scale-110 ${HERO_COLUMN_ICON_SHADOW}`}
              >
                {col.icono}
              </span>
              <div className="flex w-full flex-col items-center gap-2">
                <div className="flex w-full items-center justify-center gap-3">
                  <span className="h-px w-12 shrink-0 bg-white/50" />
                  <h2
                    className={`text-2xl font-extralight uppercase tracking-[0.32em] text-white lg:text-3xl ${HERO_COLUMN_TEXT_SHADOW}`}
                  >
                    {col.titulo.map((linea, i) => (
                      <span key={i} className="block leading-tight">
                        {linea}
                      </span>
                    ))}
                  </h2>
                  <span className="h-px w-12 shrink-0 bg-white/50" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Buscador por encima de las columnas */}
      <div className="pointer-events-none relative z-20 flex h-full min-h-0 flex-col justify-end px-4 pb-6 pt-12">
        <div className="flex shrink-0 flex-col items-center gap-y-6">
          <div className="pointer-events-auto w-full max-w-6xl min-w-0">{children}</div>
          <div className="flex flex-col items-center gap-2">
            <ChevronDown className="h-7 w-7 animate-bounce text-white/70" aria-hidden />
            <p className="bg-gradient-to-r from-white/90 via-white/45 to-white/20 bg-clip-text text-xs font-semibold uppercase tracking-[0.65em] text-transparent">
              OPORTUNIDADES
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroColumns({ children }: HeroColumnsProps) {
  return (
    <>
      <HeroMobile>{children}</HeroMobile>
      <div className="hidden md:block">
        <HeroDesktop>{children}</HeroDesktop>
      </div>
    </>
  );
}
