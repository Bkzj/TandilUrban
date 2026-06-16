'use client';

import { useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';

import { downloadInformePdfFromDom } from '@/lib/informe-pdf-client';
import type { InformePdfVariant } from '@/types/informe-pdf';

type PropiedadInformePrintButtonProps = {
  propiedadId: string;
  variant?: InformePdfVariant;
  filename?: string;
};

export function PropiedadInformePrintButton({
  propiedadId,
  variant = 'total',
  filename = 'informe-propiedad.pdf',
}: PropiedadInformePrintButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function downloadFromServer(): Promise<boolean> {
    const res = await fetch(
      `/api/panel/propiedades/${propiedadId}/informe-pdf?variant=${variant}`,
      { credentials: 'include' },
    );

    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { error?: string };
        detail = body.error ?? '';
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `Error ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadFromServer();
    } catch (serverError) {
      console.warn('[informe-pdf] server export failed, trying browser fallback', serverError);
      try {
        await downloadInformePdfFromDom(filename);
      } catch (clientError) {
        console.error('[informe-pdf] browser fallback failed', clientError);
        window.alert(
          'No se pudo generar el PDF. Podés usar Imprimir y elegir "Guardar como PDF".',
        );
      }
    } finally {
      setDownloading(false);
    }
  }

  const btnClass =
    'flex h-14 w-14 items-center justify-center rounded-full bg-verde text-white shadow-lg shadow-verde/30 transition hover:bg-verde-hover disabled:cursor-wait disabled:opacity-70';

  return (
    <div
      data-informe-chrome
      className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 print:hidden"
    >
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={downloading}
        className={btnClass}
        aria-label="Descargar informe en PDF"
        title="Descargar PDF"
      >
        {downloading ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : (
          <Download className="h-6 w-6" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className={btnClass}
        aria-label="Imprimir informe"
        title="Imprimir"
      >
        <Printer className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}
