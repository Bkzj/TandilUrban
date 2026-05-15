'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

type Props = {
  imagenes: string[];
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

export function PropertyGallery({ imagenes }: Props) {
  const [showModal, setShowModal] = useState(false);

  const gridImages = imagenes.slice(0, 5);
  const coverSrc = gridImages[0]?.trim();
  const hasAnyPhoto = imagenes.some((u) => typeof u === 'string' && u.trim().length > 0);
  const displayCover = coverSrc || (hasAnyPhoto ? '' : PLACEHOLDER);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const thumbs = [1, 2, 3, 4].map((i) => gridImages[i]?.trim() ?? '');

  return (
    <>
      <section className="relative mt-10" aria-label="Galería de imágenes">
        <div className="relative flex h-[50vh] min-h-[400px] max-h-[600px] w-full gap-2 overflow-hidden rounded-2xl">
          {/* Mitad izquierda (portada) */}
          <div
            className="group relative h-full min-h-0 w-1/2 cursor-pointer overflow-hidden"
            onClick={() => setShowModal(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowModal(true);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {displayCover ? (
              <img
                src={displayCover}
                alt="Portada"
                className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-90"
              />
            ) : (
              <PlaceholderCover />
            )}
          </div>

          {/* Mitad derecha (4 fotos) */}
          <div className="grid h-full min-h-0 w-1/2 grid-cols-2 grid-rows-2 gap-2">
            {thumbs.map((img, idx) => (
              <div
                key={idx}
                className="group relative h-full min-h-0 w-full cursor-pointer overflow-hidden"
                onClick={() => setShowModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowModal(true);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {img ? (
                  <img
                    src={img}
                    alt={`Foto ${idx + 2}`}
                    className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-90"
                  />
                ) : (
                  <PlaceholderCover />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg border border-black bg-white px-4 py-2 text-sm font-semibold text-black shadow-md transition-colors hover:bg-gray-100"
          >
            Mostrar todas las fotos
          </button>
        </div>
      </section>

      {showModal ? (
        <div
          className="fixed inset-0 z-[100] h-screen w-full overflow-y-auto bg-white"
          data-lenis-prevent="true"
          role="dialog"
          aria-modal="true"
          aria-label="Todas las fotos"
        >
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
              <span>Cerrar</span>
            </button>
          </header>

          <div className="mx-auto flex max-w-4xl flex-col gap-6 py-20 px-4">
            {imagenes.length === 0 ? (
              <p className="text-center text-gray-500">No hay fotos disponibles.</p>
            ) : (
              imagenes.map((src, index) => {
                const t = typeof src === 'string' ? src.trim() : '';
                if (!t) return null;
                return (
                  <img
                    key={`${index}-${t.slice(0, 48)}`}
                    src={t}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-auto rounded-lg object-cover"
                  />
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
