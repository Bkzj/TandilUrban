'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import type { PropertyFormData, PropiedadImagenItem } from '@/types/panel';

import { blobUrlToDataUrl } from '@/lib/blob-upload';

import { BlobImageFilesProvider, useBlobImageFilesContext } from './property-steps/BlobImageFilesContext';
import { DEFAULT_CENTER, INITIAL_DATA, STEPS, TOTAL_STEPS } from './property-steps/constants';
import { StepCaracteristicas } from './property-steps/StepCaracteristicas';
import { StepDimensiones } from './property-steps/StepDimensiones';
import { StepImagenes } from './property-steps/StepImagenes';
import { StepOperacion } from './property-steps/StepOperacion';
import { StepPrecio } from './property-steps/StepPrecio';
import { StepShell } from './property-steps/StepShell';
import { StepTextos } from './property-steps/StepTextos';
import { StepTipo } from './property-steps/StepTipo';
import { StepUbicacion } from './property-steps/StepUbicacion';
import { isStepValid } from './property-steps/validation';

export type LinearPropertyFormProps = {
  initialData?: Partial<PropertyFormData> & { id?: string };
};

/**
 * Linear-style onboarding para crear propiedades.
 * - Paleta invertida: NARANJA primario (acción/selección), VERDE secundario.
 * - Animación zig-zag: pares anclan a la izquierda, impares a la derecha.
 * - Inputs sin caja: `border-b-[3px]` sobre el gradiente dark del backoffice.
 */

export default function LinearPropertyForm(props: LinearPropertyFormProps = {}) {
  return (
    <BlobImageFilesProvider>
      <LinearPropertyFormInner {...props} />
    </BlobImageFilesProvider>
  );
}

function LinearPropertyFormInner({ initialData }: LinearPropertyFormProps = {}) {
  const router = useRouter();
  const blobFiles = useBlobImageFilesContext();
  const isEditMode = !!initialData?.id;
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(() => {
    if (!initialData) return INITIAL_DATA;
    const merged = { ...initialData };
    delete merged.id;
    return { ...INITIAL_DATA, ...merged };
  });
  const [submitting, setSubmitting] = useState(false);
  const [syncingFiles, setSyncingFiles] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const goPrev = useCallback(() => {
    setCurrentStep((step) => Math.max(0, step - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((step) => Math.min(TOTAL_STEPS - 1, step + 1));
  }, []);

  const advanceIfValid = useCallback(() => {
    if (isStepValid(STEPS[currentStep], formData)) goNext();
  }, [currentStep, formData, goNext]);

  const canContinue = useMemo(
    () => isStepValid(STEPS[currentStep], formData),
    [currentStep, formData]
  );

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && currentStep > 0) {
        event.preventDefault();
        goPrev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentStep, goPrev]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    const hasBlobImages = formData.imagenes.some((img) => img.url.startsWith('blob:'));
    setSyncingFiles(hasBlobImages);

    let imagenesPayload: PropiedadImagenItem[] = formData.imagenes.map((img) => ({
      url: img.url.trim(),
      public_id: img.public_id ?? null,
      categoria: img.categoria?.trim() || 'Sin clasificar',
    }));
    const blobSourcesUploaded: string[] = [];
    let uploadPropertyId = initialData?.id;
    let uploadToken: string | undefined;

    try {
      if (hasBlobImages) {
        const nextItems: PropiedadImagenItem[] = [];

        for (let i = 0; i < formData.imagenes.length; i++) {
          const item = formData.imagenes[i]!;
          const src = item.url;
          if (src.startsWith('blob:')) {
            const dataUrl = await blobUrlToDataUrl(src);
            const up = await fetch('/api/upload', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file: dataUrl, propertyId: uploadPropertyId, uploadToken }),
            });

            if (!up.ok) {
              const j = (await up.json().catch(() => ({}))) as { error?: string };
              throw new Error(
                typeof j.error === 'string' ? j.error : 'Falló la subida de imágenes a la nube.'
              );
            }

            const json = (await up.json()) as {
              url: string;
              public_id: string;
              propertyId: string;
              uploadToken?: string;
            };
            uploadPropertyId = json.propertyId;
            uploadToken = json.uploadToken ?? uploadToken;
            nextItems.push({
              url: json.url,
              public_id: json.public_id ?? null,
              categoria: item.categoria?.trim() || 'Sin clasificar',
            });
            blobSourcesUploaded.push(src);
          } else {
            nextItems.push({
              url: src.trim(),
              public_id: item.public_id ?? null,
              categoria: item.categoria?.trim() || 'Sin clasificar',
            });
          }
        }

        imagenesPayload = nextItems;
        setSyncingFiles(false);
      }

      let planoUrlPayload: string | null =
        formData.planoUrl.trim() !== '' ? formData.planoUrl.trim() : null;

      if (planoUrlPayload?.startsWith('blob:')) {
        const dataUrl = await blobUrlToDataUrl(planoUrlPayload);
        const up = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: dataUrl,
            propertyId: uploadPropertyId,
            uploadToken,
          }),
        });
        if (!up.ok) {
          const j = (await up.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            typeof j.error === 'string' ? j.error : 'Falló la subida del plano a la nube.',
          );
        }
        const json = (await up.json()) as {
          url: string;
          propertyId: string;
          uploadToken?: string;
        };
        uploadPropertyId = json.propertyId;
        uploadToken = json.uploadToken ?? uploadToken;
        planoUrlPayload = json.url;
        blobFiles?.unregisterBlob(formData.planoUrl);
        URL.revokeObjectURL(formData.planoUrl);
      }

      const lat = formData.lat ?? DEFAULT_CENTER.lat;
      const lng = formData.lng ?? DEFAULT_CENTER.lng;

      const payload = {
        operacion: formData.operacion,
        tipo: formData.tipo,
        direccion: formData.direccion,
        barrio: formData.barrio || null,
        lat,
        lng,
        m2Total: Number(formData.m2Total) || 0,
        m2Cubiertos: formData.m2Cubiertos ? Number(formData.m2Cubiertos) : null,
        ambientes: formData.ambientes ? Number(formData.ambientes) : null,
        dormitorios: formData.dormitorios,
        banos: formData.banos,
        cocheras: formData.cocheras,
        moneda: formData.moneda,
        precio: Number(formData.precio) || 0,
        expensas: formData.expensas ? Number(formData.expensas) : null,
        caracteristicas: formData.caracteristicas,
        imagenes: imagenesPayload,
        planoUrl: planoUrlPayload,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        uploadPropertyId,
        uploadToken,
      };

      const editId = initialData?.id;
      const url = editId ? `/api/panel/propiedades/${editId}` : '/api/panel/propiedades';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          json.error ?? (editId ? 'No pudimos guardar los cambios.' : 'No pudimos publicar la propiedad.')
        );
      }

      if (hasBlobImages) {
        for (const src of blobSourcesUploaded) {
          blobFiles?.unregisterBlob(src);
          URL.revokeObjectURL(src);
        }
      }

      setSubmitting(false);

      if (editId) {
        router.push('/panel/propiedades');
      } else {
        router.push('/panel?published=1');
      }
      router.refresh();
    } catch (err) {
      setSyncingFiles(false);
      setSubmitError(
        err instanceof Error
          ? err.message
          : initialData?.id
            ? 'No pudimos guardar los cambios.'
            : 'No pudimos publicar la propiedad.'
      );
      setSubmitting(false);
    }
    // submitting: guard de reentrada; no debe recrear el callback en cada toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [blobFiles, formData, initialData, router]);

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col px-6 py-10 text-surface md:px-8">
      <Header currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <div className="relative min-h-0 flex-1">
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex w-full flex-1 flex-col justify-center mx-auto max-w-7xl px-6 md:px-8 pb-32 pt-12">
            <div className="w-full">
              <AnimatePresence mode="wait">
                <StepShell key={STEPS[currentStep]} stepIndex={currentStep}>
                  {STEPS[currentStep] === 'operacion' && (
                    <StepOperacion
                      data={formData}
                      update={update}
                      onNext={goNext}
                      isEditMode={isEditMode}
                    />
                  )}
                  {STEPS[currentStep] === 'tipo' && (
                    <StepTipo data={formData} update={update} onNext={goNext} isEditMode={isEditMode} />
                  )}
                  {STEPS[currentStep] === 'ubicacion' && (
                    <StepUbicacion
                      data={formData}
                      update={update}
                      onNext={advanceIfValid}
                      isEditMode={isEditMode}
                    />
                  )}
                  {STEPS[currentStep] === 'dimensiones' && (
                    <StepDimensiones
                      data={formData}
                      update={update}
                      onNext={advanceIfValid}
                      isEditMode={isEditMode}
                    />
                  )}
                  {STEPS[currentStep] === 'precio' && (
                    <StepPrecio
                      data={formData}
                      update={update}
                      onNext={advanceIfValid}
                      isEditMode={isEditMode}
                    />
                  )}
                  {STEPS[currentStep] === 'caracteristicas' && (
                    <StepCaracteristicas
                      data={formData}
                      update={update}
                      isEditMode={isEditMode}
                    />
                  )}
                  {STEPS[currentStep] === 'imagenes' && (
                    <StepImagenes data={formData} update={update} onNext={goNext} isEditMode={isEditMode} />
                  )}
                  {STEPS[currentStep] === 'textos' && (
                    <StepTextos data={formData} update={update} isEditMode={isEditMode} />
                  )}
                </StepShell>
              </AnimatePresence>
            </div>

            {submitError ? (
              <p className="mt-6 shrink-0 text-sm font-medium !text-naranja-light" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Footer
        currentStep={currentStep}
        canContinue={canContinue}
        onBack={goPrev}
        onContinue={goNext}
        isLast={currentStep === TOTAL_STEPS - 1}
        submitting={submitting}
        syncingFiles={syncingFiles}
        onPublish={handleSubmit}
        isEditMode={isEditMode}
      />
    </div>
  );
}

function Header({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div aria-hidden className="min-w-0" />
      <Progress current={currentStep} total={totalSteps} />
      <span className="justify-self-end text-xs font-medium uppercase tracking-[0.18em] text-surface/50">
        {String(currentStep + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
      </span>
    </header>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <span
            key={i}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active ? 'w-8 bg-naranja' : done ? 'w-3.5 bg-naranja/60' : 'w-3.5 bg-surface/15'
            }`}
          />
        );
      })}
    </div>
  );
}

function Footer({
  currentStep,
  canContinue,
  onBack,
  onContinue,
  isLast,
  submitting,
  syncingFiles,
  onPublish,
  isEditMode,
}: {
  currentStep: number;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  isLast: boolean;
  submitting: boolean;
  syncingFiles: boolean;
  onPublish: () => void;
  isEditMode: boolean;
}) {
  const publishLabel = isEditMode
    ? !submitting
      ? 'Guardar Cambios'
      : syncingFiles
        ? 'Sincronizando archivos con la nube...'
        : 'Guardando…'
    : !submitting
      ? 'Publicar propiedad'
      : syncingFiles
        ? 'Sincronizando archivos con la nube...'
        : 'Publicando…';

  const label = isLast ? publishLabel : 'Continuar';
  const disabled = submitting || (!isLast && !canContinue) || (isLast && !canContinue);
  const showBack = currentStep > 0 && !submitting;

  return (
    <div className="pointer-events-none fixed bottom-8 left-0 right-0 z-40 mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-8">
      <button
        type="button"
        onClick={onBack}
        disabled={!showBack}
        aria-hidden={!showBack}
        tabIndex={showBack ? 0 : -1}
        className={`pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:bg-white/10 ${
          !showBack ? 'pointer-events-none opacity-0' : ''
        }`}
      >
        <span aria-hidden>←</span>
        Volver
      </button>

      <button
        type="button"
        onClick={isLast ? onPublish : onContinue}
        disabled={disabled}
        className="pointer-events-auto flex items-center gap-2 rounded-xl bg-naranja px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-naranja/80 disabled:opacity-50"
      >
        {isLast && submitting ? (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        ) : null}
        {label}
        {!isLast || !submitting ? <span aria-hidden>→</span> : null}
      </button>
    </div>
  );
}
