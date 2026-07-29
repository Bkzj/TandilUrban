'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { useDialogFocusTrap } from '@/hooks/use-dialog-focus-trap';
import type { PublicGalleryImage } from './property-gallery-types';

type PropertyGalleryLightboxProps = {
  items: PublicGalleryImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function PropertyGalleryLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: PropertyGalleryLightboxProps) {
  const total = items.length;
  const current = items[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  useDialogFocusTrap({
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [goPrev, goNext]);

  if (!current?.url?.trim()) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de fotos"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onClick={onClose}
    >
      <header
        className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="text-sm font-medium text-white/80">
          {index + 1} / {total}
          {current.categoria ? (
            <span className="ml-2 text-white/50">· {current.categoria}</span>
          ) : null}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Cerrar vista ampliada"
        >
          <X className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Cerrar</span>
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4 sm:px-20">
        {total > 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4 sm:h-12 sm:w-12"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
        ) : null}

        <motion.div
          key={index}
          className="flex h-full w-full max-w-6xl items-center justify-center"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          onClick={(event) => event.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={`Foto ${index + 1}`}
            className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
          />
        </motion.div>

        {total > 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4 sm:h-12 sm:w-12"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-7 w-7" aria-hidden />
          </button>
        ) : null}

        {total > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-0 top-0 z-[5] h-full w-[28%] cursor-w-resize sm:w-[22%]"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              aria-label="Foto anterior"
            />
            <button
              type="button"
              className="absolute right-0 top-0 z-[5] h-full w-[28%] cursor-e-resize sm:w-[22%]"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label="Foto siguiente"
            />
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
