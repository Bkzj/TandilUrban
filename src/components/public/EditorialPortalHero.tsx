'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

export const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

export const EDITORIAL_STAGGER = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.12 },
  },
};

export const EDITORIAL_FADE_UP = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EDITORIAL_EASE },
  },
};

const EDITORIAL_FADE_IN = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.85, ease: EDITORIAL_EASE },
  },
};

const CARD_LAYOUT = [
  { className: 'left-[4%] top-[8%] z-20 w-[46%] -rotate-6', delay: 0 },
  { className: 'right-[2%] top-[28%] z-30 w-[52%] rotate-3', delay: 0.4 },
  { className: 'bottom-[10%] left-[18%] z-10 w-[44%] -rotate-2', delay: 0.8 },
] as const;

type EditorialPortalHeroProps = {
  borderClassName: string;
  background: ReactNode;
  decorations: ReactNode;
  content: ReactNode;
  visual: ReactNode;
  footer: ReactNode;
  scrollHref: `#${string}`;
  scrollLabel: string;
};

export function EditorialPortalHero({
  borderClassName,
  background,
  decorations,
  content,
  visual,
  footer,
  scrollHref,
  scrollLabel,
}: EditorialPortalHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const collageY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);

  return (
    <header
      ref={sectionRef}
      className={`relative flex min-h-[75vh] flex-col overflow-hidden border-b ${borderClassName}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{ y: reduceMotion ? 0 : bgY }}
        aria-hidden
      >
        {background}
      </motion.div>

      {decorations}

      <motion.div
        className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:flex-row lg:items-center lg:gap-8 lg:pb-12"
        style={{
          opacity: reduceMotion ? 1 : contentOpacity,
          y: reduceMotion ? 0 : contentY,
        }}
      >
        <motion.div
          className="relative z-10 flex flex-1 flex-col justify-center text-center lg:max-w-[46%] lg:text-left"
          variants={EDITORIAL_STAGGER}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
        >
          {content}
        </motion.div>

        <motion.div
          className="relative mt-10 min-h-[280px] flex-1 sm:min-h-[340px] lg:mt-0 lg:min-h-[420px]"
          style={{ y: reduceMotion ? 0 : collageY }}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={EDITORIAL_STAGGER}
        >
          {visual}
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 border-t border-white/10 bg-black/15 backdrop-blur-md"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.85, duration: reduceMotion ? 0 : 0.6, ease: EDITORIAL_EASE }}
      >
        {footer}
      </motion.div>

      <motion.a
        href={scrollHref}
        className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:bottom-24"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: [0, 6, 0] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                opacity: { delay: 1.1, duration: 0.5 },
                y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 },
              }
        }
        aria-label={scrollLabel}
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">Scroll</span>
        <ChevronDown className="h-5 w-5" aria-hidden />
      </motion.a>
    </header>
  );
}

type EditorialHeroCollageProps = {
  images: readonly string[];
  cardClassName?: (index: number) => string;
  renderOverlay?: (index: number) => ReactNode;
};

export function EditorialHeroCollage({
  images,
  cardClassName,
  renderOverlay,
}: EditorialHeroCollageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div
        className="absolute inset-0 rounded-[2rem] bg-white/5 backdrop-blur-sm lg:rounded-[2.5rem]"
        style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}
        aria-hidden
      />
      <div className="relative mx-auto h-full max-w-md lg:max-w-none lg:min-h-[420px]">
        {images.map((src, index) => {
          const layout = CARD_LAYOUT[index];
          if (!layout) return null;
          return (
            <motion.div
              key={src}
              variants={EDITORIAL_FADE_IN}
              className={`absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/35 ring-2 ${layout.className} ${
                cardClassName?.(index) ?? 'ring-white/20'
              }`}
            >
              <motion.div
                className="relative"
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 4.5 + layout.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: layout.delay,
                      }
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-[4/5] w-full object-cover" />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                  aria-hidden
                />
                {renderOverlay?.(index)}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

export function fillEditorialImages(
  images: readonly string[],
  fallback: readonly string[],
): string[] {
  const output = [...images];
  for (const source of fallback) {
    if (output.length >= CARD_LAYOUT.length) break;
    if (!output.includes(source)) output.push(source);
  }
  return output.slice(0, CARD_LAYOUT.length);
}
