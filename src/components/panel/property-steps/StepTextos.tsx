'use client';

import { useCallback, useState } from 'react';

import type { StepProps } from '@/types/panel';

import { StepHeading, SubtleInput } from './step-ui';

/** Lee blob: (o URL obturable) y devuelve Base64 puro, sin prefijo data:image/… */
async function blobToBase64(blobUrl: string): Promise<string | null> {
  try {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
  } catch {
    return null;
  }
}

export function StepTextos({ data, update, isEditMode }: Omit<StepProps, 'onNext'>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notasIA, setNotasIA] = useState('');

  const handleGenerateAI = useCallback(async () => {
    setIsGenerating(true);
    try {
      let portadaBase64: string | null = null;
      const firstUrl = data.imagenes[0]?.url;
      if (typeof firstUrl === 'string' && firstUrl.length > 0) {
        portadaBase64 = await blobToBase64(firstUrl);
      }

      const res = await fetch('/api/panel/propiedades/generar-textos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          ...(portadaBase64 ? { portadaBase64 } : {}),
          notasIA,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        titulo?: string;
        descripcion?: string;
        error?: string;
      };

      if (!res.ok) {
        console.error('[StepTextos] generar-textos:', json.error ?? res.status);
        return;
      }

      if (typeof json.titulo === 'string' && typeof json.descripcion === 'string') {
        update('titulo', json.titulo);
        update('descripcion', json.descripcion);
      }
    } catch (err) {
      console.error('[StepTextos] generar-textos', err);
    } finally {
      setIsGenerating(false);
    }
  }, [data, notasIA, update]);

  return (
    <>
      <StepHeading>
        {isEditMode ? 'Mejorá el título y la descripción' : 'Contanos más sobre esta propiedad'}
      </StepHeading>
      <h2 className="mt-3 max-w-2xl text-lg font-medium leading-snug text-white/90 md:text-2xl">
        {isEditMode ? 'Revisá los cambios antes de guardar' : 'Revisá todo antes de publicar'}
      </h2>

      <textarea
        value={notasIA}
        onChange={(e) => setNotasIA(e.target.value)}
        disabled={isGenerating}
        placeholder="Contexto para la IA (Opcional). Ej: Solo para estudiantes, alquiler temporal por 6 meses, se pide garantía propietaria..."
        className="mt-5 w-full rounded-xl border !border-surface/20 !bg-black/20 p-4 !text-white focus:!border-naranja outline-none transition-colors placeholder:!text-surface/50 mb-4 min-h-[100px] resize-none"
      />

      <button
        type="button"
        onClick={handleGenerateAI}
        disabled={isGenerating}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border !border-naranja/40 !bg-naranja/10 p-4 font-semibold !text-naranja transition-all hover:!bg-naranja/20"
      >
        {isGenerating ? 'Pensando magia...' : '✨ Redactar con IA'}
      </button>

      <div className="space-y-6">
        <SubtleInput
          label="Título"
          placeholder="Casa luminosa con parque y vista a las sierras"
          value={data.titulo}
          onChange={(v) => update('titulo', v)}
          autoFocus
          disabled={isGenerating}
        />
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
            Descripción
          </span>
          <textarea
            value={data.descripcion}
            onChange={(e) => update('descripcion', e.target.value)}
            rows={5}
            disabled={isGenerating}
            placeholder="3 dormitorios, 2 baños, parque con asador, ubicado a 5 minutos del centro…"
            className="w-full resize-none border-0 border-b-[3px] border-surface/40 bg-transparent px-0 pb-3 pt-2 text-lg font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55 disabled:opacity-50"
          />
        </div>
      </div>
    </>
  );
}
