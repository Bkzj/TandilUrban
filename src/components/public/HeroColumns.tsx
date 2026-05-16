'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { HERO_VIDEO_SRC, HERO_VIDEO_STILL, IMAGENES_HOME } from '@/constants/home';

const IconoModerno = ({ nombre }: { nombre: string }) => {
  const baseClasses = 'mb-4 h-10 w-10 text-white/95 drop-shadow-md md:h-12 md:w-12';
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
  },
  {
    id: 'destacados',
    icono: <IconoModerno nombre="destacados" />,
    titulo: ['DESTACADOS'],
    fondo: IMAGENES_HOME.destacados,
  },
  {
    id: 'emprendimientos',
    icono: <IconoModerno nombre="emprendimientos" />,
    titulo: ['EMPRENDIMIENTOS'],
    fondo: IMAGENES_HOME.tasaciones,
  },
  {
    id: 'inmobiliarias',
    icono: <IconoModerno nombre="inmobiliarias" />,
    titulo: ['INMOBILIARIAS'],
    fondo: IMAGENES_HOME.nosotros,
  },
] as const;

type HeroColumnsProps = {
  /** Buscador centrado (p. ej. HeroSearch con autocomplete). */
  children: ReactNode;
};

export function HeroColumns({ children }: HeroColumnsProps) {
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
    <section className="relative flex min-h-[100dvh] h-screen w-full flex-col overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${HERO_VIDEO_STILL}')` }}
        aria-hidden
      />
      {!videoBroken ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
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
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/35 via-black/20 to-black/55" />

      <div className="absolute inset-0 z-10 flex min-h-0 w-full flex-row">
        {COLUMNAS.map((col) => (
          <div
            key={col.id}
            className="group relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden border-r border-white/10 transition-[flex] duration-500 ease-out last:border-r-0 hover:flex-[1.5]"
          >
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-cover bg-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ backgroundImage: `url('${col.fondo}')` }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-black/35 transition-colors duration-500 group-hover:bg-black/45" />

            <div className="relative z-20 flex w-full flex-col items-center justify-center px-3 text-center md:px-4">
              <span className="mb-5 scale-100 transition-transform duration-500 group-hover:scale-110">
                {col.icono}
              </span>
              <div className="flex w-full max-w-[14rem] flex-col items-center gap-2 md:max-w-none">
                <div className="flex w-full items-center justify-center gap-3">
                  <span className="h-px w-8 shrink-0 bg-white/50 md:w-12" />
                  <h2 className="text-lg font-extralight uppercase tracking-[0.28em] text-white drop-shadow-lg md:text-2xl md:tracking-[0.32em] lg:text-3xl">
                    {col.titulo.map((linea, i) => (
                      <span key={i} className="block leading-tight">
                        {linea}
                      </span>
                    ))}
                  </h2>
                  <span className="h-px w-8 shrink-0 bg-white/50 md:w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 flex min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-end px-4 pb-5 pt-20 sm:pb-6 md:pb-8">
          <div className="pointer-events-auto w-full max-w-6xl">{children}</div>
        </div>
        <div className="pointer-events-none shrink-0 pb-8 pt-1 text-center md:pb-10">
          <p className="bg-gradient-to-r from-white/90 via-white/45 to-white/20 bg-clip-text text-[0.7rem] font-semibold uppercase tracking-[0.55em] text-transparent md:text-xs md:tracking-[0.65em]">
            OPORTUNIDADES
          </p>
        </div>
      </div>
    </section>
  );
}
