'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, X } from 'lucide-react';

import { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';
import { PropertyGalleryLightbox } from './PropertyGalleryLightbox';
import type { PublicGalleryImage } from './property-gallery-types';

type Props = {
  /** Campo Prisma `imagenes` (Json), string JSON serializado, o equivalente. */
  imagenes: unknown;
};

type GridLayout = 'empty' | 'one' | 'two' | 'three' | 'four' | 'fivePlus';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop';

function resolveLayout(count: number): GridLayout {
  if (count <= 0) return 'empty';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  if (count === 3) return 'three';
  if (count === 4) return 'four';
  return 'fivePlus';
}

function PlaceholderCover() {
  return (
    <div
      className="h-full w-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300"
      aria-hidden
    />
  );
}

/** Vista pública: categorías vacías o «Sin clasificar» → «Otras». */
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

function mosaicGridClass(count: number): string {
  if (count === 1) return 'grid max-w-3xl grid-cols-1 gap-3 mx-auto';
  if (count === 2) return 'grid grid-cols-2 gap-3';
  if (count === 3) return 'grid grid-cols-2 gap-3 md:grid-cols-3';
  return 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
}

function mosaicItemClass(count: number, index: number): string {
  if (count === 3 && index === 0) return 'col-span-2 row-span-2 md:col-span-2 md:row-span-1 aspect-[16/10] md:aspect-auto md:min-h-[220px]';
  return 'aspect-[4/3] sm:aspect-[5/4]';
}

type GalleryTileProps = {
  src: string;
  alt: string;
  onOpen: () => void;
  className?: string;
  overlay?: ReactNode;
};

function GalleryTile({ src, alt, onOpen, className = '', overlay }: GalleryTileProps) {
  return (
    <div
      className={`group relative block h-full w-full min-h-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg hover:ring-black/10 sm:rounded-2xl ${className}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={alt}
        className="absolute inset-0 z-0 block h-full w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-naranja focus-visible:ring-offset-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
        <span
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10"
          aria-hidden
        />
      </button>
      {overlay}
    </div>
  );
}

function ShowAllButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-md transition-colors hover:bg-gray-50 ${className}`}
    >
      <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
      Mostrar todas las fotos
    </button>
  );
}

export function PropertyGallery({ imagenes }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const items = useMemo(() => normalizeGalleryImages(imagenes), [imagenes]);
  const groupedImages = useMemo(() => groupGalleryImages(items), [items]);
  const layout = resolveLayout(items.length);

  const coverSrc = items[0]?.url?.trim();
  const hasAnyPhoto = items.some((u) => typeof u.url === 'string' && u.url.trim().length > 0);
  const displayCover = coverSrc || (hasAnyPhoto ? '' : PLACEHOLDER);

  const openLightbox = useCallback((index: number) => {
    if (index >= 0 && index < items.length) setLightboxIndex(index);
  }, [items.length]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (!showModal || lightboxIndex !== null) return;
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
  }, [showModal, lightboxIndex]);

  function openModal() {
    setShowModal(true);
  }

  const globalIndexByUrl = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((img, i) => m.set(img.url, i));
    return m;
  }, [items]);

  const heroHeight =
    'h-[42vh] min-h-[220px] sm:min-h-[260px] sm:h-[48vh] md:h-[56vh] lg:h-[58vh]';

  function renderHeroGrid() {
    if (layout === 'empty') {
      return (
        <div className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl ${heroHeight}`}>
          <PlaceholderCover />
        </div>
      );
    }

    if (layout === 'one') {
      const src = items[0]!.url.trim() || displayCover;
      return (
        <div className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl ${heroHeight}`}>
          <GalleryTile
            src={src}
            alt="Portada"
            onOpen={() => openLightbox(0)}
            className="h-full rounded-xl sm:rounded-2xl"
          />
        </div>
      );
    }

    if (layout === 'two') {
      return (
        <div className={`grid w-full grid-cols-2 gap-2 overflow-hidden rounded-xl sm:gap-2.5 sm:rounded-2xl ${heroHeight}`}>
          {items.slice(0, 2).map((img, i) => (
            <GalleryTile
              key={`${img.url}-${i}`}
              src={img.url.trim()}
              alt={`Foto ${i + 1}`}
              onOpen={() => openLightbox(i)}
              className="rounded-xl sm:rounded-2xl"
            />
          ))}
        </div>
      );
    }

    if (layout === 'three') {
      return (
        <div
          className={`grid w-full grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:gap-2.5 sm:rounded-2xl ${heroHeight}`}
        >
          <GalleryTile
            src={items[0]!.url.trim()}
            alt="Foto 1"
            onOpen={() => openLightbox(0)}
            className="row-span-2 rounded-xl sm:rounded-2xl"
          />
          {items.slice(1, 3).map((img, i) => (
            <GalleryTile
              key={`${img.url}-${i}`}
              src={img.url.trim()}
              alt={`Foto ${i + 2}`}
              onOpen={() => openLightbox(i + 1)}
              className="rounded-xl sm:rounded-2xl"
            />
          ))}
        </div>
      );
    }

    if (layout === 'four') {
      return (
        <div
          className={`grid w-full grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:gap-2.5 sm:rounded-2xl ${heroHeight}`}
        >
          {items.slice(0, 4).map((img, i) => (
            <GalleryTile
              key={`${img.url}-${i}`}
              src={img.url.trim()}
              alt={`Foto ${i + 1}`}
              onOpen={() => openLightbox(i)}
              className="rounded-xl sm:rounded-2xl"
              overlay={
                i === 3 && items.length > 4 ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end p-3">
                    <ShowAllButton onClick={openModal} className="pointer-events-auto" />
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      );
    }

    /* fivePlus */
    const thumbSlots = [1, 2, 3, 4] as const;
    return (
      <div
        className={`relative grid w-full grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:gap-2.5 sm:rounded-2xl ${heroHeight}`}
      >
        <GalleryTile
          src={items[0]!.url.trim() || displayCover}
          alt="Portada"
          onOpen={() => openLightbox(0)}
          className="col-span-4 row-span-2 md:col-span-2 md:row-span-2 rounded-xl sm:rounded-2xl"
          overlay={
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-end p-3 md:hidden">
              <ShowAllButton onClick={openModal} className="pointer-events-auto" />
            </div>
          }
        />
        {thumbSlots.map((slotIdx) => {
          const img = items[slotIdx];
          const url = img?.url?.trim() ?? '';
          const isLastSlot = slotIdx === 4;
          return (
            <div key={slotIdx} className="relative hidden min-h-0 md:block md:col-span-1 md:row-span-1">
              {url ? (
                <GalleryTile
                  src={url}
                  alt={`Foto ${slotIdx + 1}`}
                  onOpen={() => openLightbox(slotIdx)}
                  className="h-full rounded-xl sm:rounded-2xl"
                  overlay={
                    isLastSlot ? (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end p-3">
                        <ShowAllButton onClick={openModal} className="pointer-events-auto" />
                      </div>
                    ) : null
                  }
                />
              ) : (
                <PlaceholderCover />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <section className="relative mt-6 w-full min-w-0 sm:mt-10" aria-label="Galería de imágenes">
        {renderHeroGrid()}
        {items.length >= 2 && layout !== 'fivePlus' ? (
          <div className="mt-3 flex justify-end">
            <ShowAllButton onClick={openModal} />
          </div>
        ) : null}
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
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur-md">
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

            <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
              {items.length === 0 ? (
                <p className="py-16 text-center text-gray-500">No hay fotos disponibles.</p>
              ) : (
                Object.entries(groupedImages).map(([categoria, fotos]) => (
                  <section key={categoria} aria-labelledby={`cat-${categoria.replace(/\s+/g, '-')}`}>
                    <h2
                      id={`cat-${categoria.replace(/\s+/g, '-')}`}
                      className="mb-5 mt-10 text-xl font-semibold capitalize text-gray-900 first:mt-4 sm:text-2xl"
                    >
                      {categoria}
                      <span className="ml-2 text-base font-normal text-gray-400">
                        ({fotos.length})
                      </span>
                    </h2>
                    <div className={mosaicGridClass(fotos.length)}>
                      {fotos.map((photo, index) => {
                        const globalIdx = globalIndexByUrl.get(photo.url) ?? 0;
                        return (
                          <GalleryTile
                            key={`${photo.url}-${index}`}
                            src={photo.url}
                            alt={`${categoria} ${index + 1}`}
                            onOpen={() => openLightbox(globalIdx)}
                            className={mosaicItemClass(fotos.length, index)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxIndex !== null ? (
          <PropertyGalleryLightbox
            items={items}
            index={lightboxIndex}
            onClose={closeLightbox}
            onIndexChange={setLightboxIndex}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
