'use client';

import type { StepProps } from '@/types/panel';

import { StepHeading, UploadCard } from './step-ui';

export function StepImagenes(_props: StepProps) {
  return (
    <>
      <StepHeading>Sumá fotos de la propiedad</StepHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard onClick={() => undefined} label="Subir desde PC" hint="JPG / PNG · hasta 10 MB c/u" icon="↑" />
        <UploadCard
          onClick={() => undefined}
          label="Importar de Google Drive"
          hint="Conectá tu cuenta y elegí una carpeta"
          icon="◐"
        />
      </div>
      <p className="text-xs text-surface/45">Vas a poder ordenar y elegir la portada después de cargar.</p>
    </>
  );
}
