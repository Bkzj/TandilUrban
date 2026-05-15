'use client';

import { useRef, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { StepProps } from '@/types/panel';

import { useBlobImageFilesContext } from './BlobImageFilesContext';
import { StepHeading, UploadCard } from './step-ui';

const MAX_BYTES = 10 * 1024 * 1024;

export function StepImagenes({ data, update, isEditMode }: StepProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blobFiles = useBlobImageFilesContext();

  function openPicker() {
    inputRef.current?.click();
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const previews: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_BYTES) continue;
      const url = URL.createObjectURL(file);
      blobFiles?.registerBlob(url, file);
      previews.push(url);
    }

    if (previews.length) {
      update('imagenes', [...data.imagenes, ...previews]);
    }

    event.target.value = '';
  }

  function removeImage(url: string) {
    update(
      'imagenes',
      data.imagenes.filter((u) => u !== url)
    );
    if (url.startsWith('blob:')) {
      blobFiles?.unregisterBlob(url);
      URL.revokeObjectURL(url);
    }
  }

  function moveImage(index: number, direction: number) {
    const j = index + direction;
    if (j < 0 || j >= data.imagenes.length) return;
    const next = [...data.imagenes];
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    update('imagenes', next);
  }

  return (
    <>
      <StepHeading>
        {isEditMode
          ? 'Organizá, sumá o eliminá imágenes'
          : 'Subí las mejores fotos de la propiedad'}
      </StepHeading>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFiles}
        hidden
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard
          onClick={openPicker}
          label="Subir desde PC"
          hint="JPG / PNG · hasta 10 MB c/u"
          icon="↑"
        />
        <UploadCard
          onClick={() => undefined}
          label="Importar de Google Drive"
          hint="Conectá tu cuenta y elegí una carpeta"
          icon="◐"
        />
      </div>

      {data.imagenes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.imagenes.map((url, idx) => (
            <div
              key={`${idx}-${url.slice(0, 48)}`}
              className="group relative aspect-square overflow-hidden rounded-xl border !border-surface/15 !bg-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Imagen ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-2 z-[1] flex justify-center gap-1 opacity-90 transition-opacity md:opacity-0 md:group-hover:opacity-95">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveImage(idx, -1);
                  }}
                  disabled={idx === 0}
                  aria-label="Mover izquierda"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border !border-white/20 !bg-black/75 !text-white shadow-sm transition-colors hover:!bg-black/90 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveImage(idx, 1);
                  }}
                  disabled={idx === data.imagenes.length - 1}
                  aria-label="Mover derecha"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border !border-white/20 !bg-black/75 !text-white shadow-sm transition-colors hover:!bg-black/90 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Quitar imagen"
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 !text-white text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                ×
              </button>
              {idx === 0 ? (
                <span className="absolute bottom-2 left-2 rounded-md bg-naranja px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest !text-white">
                  Portada
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-surface/45">
          Vas a poder ordenar y elegir la portada después de cargar.
        </p>
      )}
    </>
  );
}
