'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, X } from 'lucide-react';

import { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';

export type PublicGalleryImage = {
  url: string;
  categoria: string;
};

type Props = {
  /** Campo Prisma `imagenes` (Json), string JSON serializado, o equivalente. */
  imagenes: unknown;
};

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop';

function PlaceholderCover() {
  return (
    <div
      className="h-full w-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300"
      aria-hidden
    />
  );
}

/** Vista pública: categorías vacías o «Sin clasificar» → «Otras». Parse Json/string vía `normalizePropiedadImagenesDb`. */
export function normalizeGalleryImages(raw: unknown): PublicGalleryImage[] {
  const fromDb = normalizePropiedadImagenesDb(raw);
  return fromDb.map((img) => {
    const cat = img.categoria?.trim();
    const usable =
      cat && cat.length > 0 && cat !== 'Sin clasificar' ? cat : 'Otras';
    return { url: img.url, categoria: usable };
  });
}

function groupGalleryImages(imagenes: PublicGalleryImage[]): Record<string, PublicGalleryImage[]> {
  return imagenes.reduce(
    (acc, img) => {
      acc[img.categoria] = acc[img.categoria] || [];
      acc[img.categoria].push(img);
      return acc;
    },
    {} as Record<string, PublicGalleryImage[]>
  );
}

export function PropertyGallery({ imagenes }: Props) {
  const [showModal, setShowModal] = useState(false);

  const items = useMemo(() => normalizeGalleryImages(imagenes), [imagenes]);
  const groupedImages = useMemo(() => groupGalleryImages(items), [items]);

  const gridImages = items.slice(0, 5);
  const coverSrc = gridImages[0]?.url?.trim();
  const hasAnyPhoto = items.some((u) => typeof u.url === 'string' && u.url.trim().length > 0);
  const displayCover = coverSrc || (hasAnyPhoto ? '' : PLACEHOLDER);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [showModal]);

  function openModal() {
    setShowModal(true);
  }

  const thumbSlots = [1, 2, 3, 4] as const;

  return (
    <>
      <section className="relative mt-6 w-full min-w-0 sm:mt-10" aria-label="Galería de imágenes">
        <div className="relative grid h-[42vh] min-h-[240px] w-full grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:h-[50vh] sm:rounded-2xl md:h-[60vh]">
          {/* Principal */}
          <div
            className="group relative col-span-4 row-span-2 min-h-0 cursor-pointer overflow-hidden md:col-span-2"
            onClick={() => openModal()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {displayCover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayCover}
                alt="Portada"
                className="h-full w-full object-cover transition-opacity duration-300 hover:opacity-90"
              />
            ) : (
              <PlaceholderCover />
            )}
            {/* Móvil: botón sobre la única foto visible */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-3 md:hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal();
                }}
                className="pointer-events-auto flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-md transition-colors hover:bg-gray-50"
              >
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                Mostrar todas las fotos
              </button>
            </div>
          </div>

          {thumbSlots.map((slotIdx) => {
            const img = gridImages[slotIdx]?.url?.trim() ?? '';
            const isLastSlot = slotIdx === 4;
            return (
              <div
                key={slotIdx}
                className="relative hidden min-h-0 cursor-pointer overflow-hidden md:block md:col-span-1 md:row-span-1"
                onClick={() => openModal()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {img ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt={`Foto ${slotIdx + 1}`}
                    className="h-full w-full object-cover transition-opacity duration-300 hover:opacity-90"
                  />
                ) : (
                  <PlaceholderCover />
                )}
                {isLastSlot ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal();
                    }}
                    className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-md transition-colors hover:bg-gray-50"
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                    Mostrar todas las fotos
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {showModal ? (
          <motion.div
            key="gallery-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Todas las fotos por categoría"
            data-lenis-prevent="true"
            className="fixed inset-0 z-50 overflow-y-auto bg-white"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                aria-label="Cerrar galería"
              >
                <X className="h-5 w-5" aria-hidden />
                <span>Cerrar</span>
              </button>
            </header>

            <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
              {items.length === 0 ? (
                <p className="py-16 text-center text-gray-500">No hay fotos disponibles.</p>
              ) : (
                Object.entries(groupedImages).map(([categoria, fotos]) => (
                  <section key={categoria} aria-labelledby={`cat-${categoria.replace(/\s+/g, '-')}`}>
                    <h2
                      id={`cat-${categoria.replace(/\s+/g, '-')}`}
                      className="mt-12 mb-6 text-2xl font-semibold capitalize text-gray-900"
                    >
                      {categoria}
                    </h2>
                    <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                      {fotos.map((photo, index) => (
                        <div
                          key={`${photo.url}-${index}`}
                          className="break-inside-avoid relative w-full overflow-hidden rounded-xl"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={`${categoria} ${index + 1}`}
                            className="h-auto w-full object-cover transition-opacity duration-300 hover:opacity-90"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
