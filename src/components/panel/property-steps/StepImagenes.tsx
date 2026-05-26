'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronLeft, ChevronRight, X } from 'lucide-react';

import type { PropiedadImagenItem, StepProps } from '@/types/panel';

import { imageUrlToCompressedJpegBase64 } from '@/lib/image-compress-client';

import { useBlobImageFilesContext } from './BlobImageFilesContext';
import { StepHeading, UploadCard } from './step-ui';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PLANO_BYTES = 12 * 1024 * 1024;
/** Máximo de fotos por propiedad (lujo / payload fragmentado por lotes). */
export const MAX_PROP_IMAGES = 80;
const BATCH_SIZE = 15;

const LOADING_PHRASES = [
  'Puff, cuántas fotos…',
  'Sigo mirando…',
  'Buscando el jacuzzi…',
  'Calculando si entra un sillón…',
  'Casi termino…',
];

function defaultItem(url: string): PropiedadImagenItem {
  return { url, public_id: null, categoria: 'Sin clasificar' };
}

export function StepImagenes({ data, update, isEditMode }: StepProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blobFiles = useBlobImageFilesContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [phraseIx, setPhraseIx] = useState(0);
  const [iaError, setIaError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  useEffect(() => {
    if (!isProcessing) return;
    const id = window.setInterval(() => {
      setPhraseIx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [isProcessing]);

  function openPicker() {
    if (data.imagenes.length >= MAX_PROP_IMAGES || isProcessing) return;
    inputRef.current?.click();
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const nuevas: PropiedadImagenItem[] = [];
    const room = MAX_PROP_IMAGES - data.imagenes.length;
    if (room <= 0) {
      event.target.value = '';
      return;
    }

    for (const file of files) {
      if (nuevas.length >= room) break;
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_BYTES) continue;
      const url = URL.createObjectURL(file);
      blobFiles?.registerBlob(url, file);
      nuevas.push(defaultItem(url));
    }

    if (nuevas.length) {
      update('imagenes', [...data.imagenes, ...nuevas]);
    }

    event.target.value = '';
  }

  function removeImage(index: number) {
    const item = data.imagenes[index];
    if (!item) return;
    update(
      'imagenes',
      data.imagenes.filter((_, i) => i !== index)
    );
    if (item.url.startsWith('blob:')) {
      blobFiles?.unregisterBlob(item.url);
      URL.revokeObjectURL(item.url);
    }
  }

  function onPlanoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!okType || file.size > MAX_PLANO_BYTES) return;

    const prev = data.planoUrl;
    if (prev.startsWith('blob:')) {
      blobFiles?.unregisterBlob(prev);
      URL.revokeObjectURL(prev);
    }

    const url = URL.createObjectURL(file);
    blobFiles?.registerBlob(url, file);
    update('planoUrl', url);
  }

  function removePlano() {
    const prev = data.planoUrl;
    if (prev.startsWith('blob:')) {
      blobFiles?.unregisterBlob(prev);
      URL.revokeObjectURL(prev);
    }
    update('planoUrl', '');
  }

  function moveImage(index: number, direction: number) {
    const j = index + direction;
    if (j < 0 || j >= data.imagenes.length) return;
    const next = [...data.imagenes];
    const tmp = next[index];
    next[index] = next[j]!;
    next[j] = tmp!;
    update('imagenes', next);
  }

  async function clasificarConIA() {
    if (isProcessing || data.imagenes.length === 0) return;
    setIaError(null);
    setIsProcessing(true);
    setBatchProgress(null);
    setPhraseIx(0);

    try {
      const bases: string[] = [];
      for (let i = 0; i < data.imagenes.length; i++) {
        const url = data.imagenes[i]!.url;
        const b64 = await imageUrlToCompressedJpegBase64(url, 512, 0.6);
        if (!b64) {
          throw new Error(`No pudimos comprimir la foto ${i + 1}. Probá con otro formato o más liviana.`);
        }
        bases.push(b64);
      }

      const chunks: string[][] = [];
      for (let i = 0; i < bases.length; i += BATCH_SIZE) {
        chunks.push(bases.slice(i, i + BATCH_SIZE));
      }

      const mergedByIndex = new Map<number, string>();
      let offset = 0;
      let batchIndex = 0;

      for (const chunk of chunks) {
        batchIndex += 1;
        setBatchProgress({ current: batchIndex, total: chunks.length });

        const res = await fetch('/api/panel/ia-ordenar-fotos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            layoutContext: data.layoutContext,
            imagesBase64: chunk,
          }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          clasificaciones?: { index: number; categoria: string }[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(typeof json.error === 'string' ? json.error : 'Falló la clasificación con IA.');
        }

        const list = json.clasificaciones;
        if (!Array.isArray(list)) {
          throw new Error('Respuesta inválida del servidor.');
        }

        for (const row of list) {
          const absolute = offset + row.index;
          mergedByIndex.set(absolute, row.categoria.trim());
        }

        offset += chunk.length;
      }

      update(
        'imagenes',
        data.imagenes.map((img, idx) => ({
          ...img,
          categoria: mergedByIndex.get(idx) ?? img.categoria ?? 'Sin clasificar',
        }))
      );
    } catch (e) {
      setIaError(e instanceof Error ? e.message : 'Algo salió mal con la IA.');
    } finally {
      setBatchProgress(null);
      setIsProcessing(false);
    }
  }

  return (
    <>
      <StepHeading>
        {isEditMode
          ? 'Organizá, sumá o eliminá imágenes'
          : 'Subí las mejores fotos de la propiedad'}
      </StepHeading>

      <section className="mt-6 rounded-2xl border border-naranja/25 bg-naranja/5 p-4 md:p-5">
        <div className="flex gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-naranja/20 text-naranja"
            aria-hidden
          >
            <Award className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-surface">
              Subir el plano de la propiedad aumenta un 40% las consultas. ¡Destacá tu publicación!
            </p>
            <p className="mt-1 text-xs text-surface/55">JPG, PNG o PDF · hasta 12 MB</p>
          </div>
        </div>

        {data.planoUrl ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface/15 bg-black/25 px-4 py-3">
            <p className="truncate text-sm text-surface/85">
              {data.planoUrl.startsWith('blob:') ? 'Plano listo para subir' : 'Plano cargado'}
            </p>
            <button
              type="button"
              onClick={removePlano}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 rounded-lg border border-surface/20 px-3 py-1.5 text-xs font-semibold text-surface/80 transition hover:border-naranja/40 hover:text-naranja-light"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Quitar
            </button>
          </div>
        ) : (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-naranja/35 bg-black/20 px-4 py-6 text-center transition hover:border-naranja/60 hover:bg-naranja/10">
            <span className="text-sm font-semibold text-naranja-light">Adjuntar plano</span>
            <span className="mt-1 text-xs text-surface/50">Tocá para elegir archivo</span>
            <input
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="sr-only"
              disabled={isProcessing}
              onChange={onPlanoFile}
            />
          </label>
        )}
      </section>

      <label className="mt-4 block">
        <span className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/55">
          Distribución de la propiedad (Ej: 1 living, 2 habitaciones, 1 baño)
        </span>
        <textarea
          value={data.layoutContext}
          onChange={(e) => update('layoutContext', e.target.value)}
          disabled={isProcessing}
          rows={3}
          placeholder="Ayuda a la IA a etiquetar: zonas, cantidad de dormitorios, baños, patio…"
          className="w-full resize-none rounded-xl border !border-surface/15 !bg-black/25 px-4 py-3 text-sm text-white/90 outline-none ring-0 transition-colors placeholder:text-surface/45 focus:!border-naranja/50 disabled:opacity-60"
        />
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFiles}
        hidden
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <UploadCard
          onClick={openPicker}
          label="Subir desde PC"
          hint={`JPG / PNG · hasta 10 MB · máx. ${MAX_PROP_IMAGES} fotos`}
          icon="↑"
        />
        <UploadCard
          onClick={() => undefined}
          label="Importar de Google Drive"
          hint="Conectá tu cuenta y elegí una carpeta"
          icon="◐"
        />
      </div>

      <p className="mt-2 text-center text-[0.7rem] text-surface/50">
        {data.imagenes.length}/{MAX_PROP_IMAGES} fotos
        {data.imagenes.length >= MAX_PROP_IMAGES ? (
          <span className="mt-1 block font-medium text-naranja-light/90">
            Límite alcanzado: eliminá una foto para subir más.
          </span>
        ) : null}
      </p>

      {data.imagenes.length > 0 ? (
        <div className="mt-6 flex flex-col items-stretch gap-3">
          <div className="relative mx-auto w-full max-w-md">
            <motion.button
              type="button"
              onClick={() => void clasificarConIA()}
              disabled={isProcessing}
              animate={{ scale: isProcessing ? 1 : [1, 1.02, 1] }}
              transition={
                isProcessing
                  ? { duration: 0.2 }
                  : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              }
              className="relative w-full overflow-hidden rounded-full border border-white/15 bg-gradient-to-r from-naranja via-orange-400 to-naranja px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(255,165,0,0.5)] disabled:pointer-events-none disabled:opacity-55"
            >
              <span className="relative z-[1] flex min-h-[2.5rem] flex-col items-center justify-center gap-1 px-2 text-center leading-snug">
                <span>{isProcessing ? LOADING_PHRASES[phraseIx] : '✨ Ordenar fotos con IA'}</span>
                {isProcessing && batchProgress ? (
                  <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-white/90">
                    Procesando lote {batchProgress.current} de {batchProgress.total}
                  </span>
                ) : null}
              </span>
            </motion.button>
            <span className="pointer-events-none absolute -right-1 -top-1 z-[2] rounded-md bg-white/95 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wider text-naranja shadow-sm">
              BETA
            </span>
          </div>

          {iaError ? (
            <p className="text-center text-xs font-medium text-naranja-light/95" role="alert">
              {iaError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.imagenes.map((item, idx) => (
              <div
                key={`${idx}-${item.url.slice(0, 48)}`}
                className="group relative flex flex-col gap-1"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border !border-surface/15 !bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
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
                      disabled={idx === 0 || isProcessing}
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
                      disabled={idx === data.imagenes.length - 1 || isProcessing}
                      aria-label="Mover derecha"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border !border-white/20 !bg-black/75 !text-white shadow-sm transition-colors hover:!bg-black/90 disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    disabled={isProcessing}
                    aria-label="Quitar imagen"
                    className="absolute right-2 top-2 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 !text-white text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:pointer-events-none disabled:opacity-30"
                  >
                    ×
                  </button>
                  {idx === 0 ? (
                    <span className="absolute bottom-2 left-2 rounded-md bg-naranja px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest !text-white">
                      Portada
                    </span>
                  ) : null}
                </div>
                <p className="truncate px-0.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-surface/65">
                  {item.categoria?.trim() || 'Sin clasificar'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-surface/45">
          Vas a poder ordenar y elegir la portada después de cargar.
        </p>
      )}
    </>
  );
}
