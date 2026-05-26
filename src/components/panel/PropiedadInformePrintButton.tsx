'use client';

import { Printer } from 'lucide-react';

export function PropiedadInformePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-verde p-4 text-white shadow-lg shadow-verde/30 transition hover:bg-verde-hover print:hidden"
      aria-label="Imprimir informe"
    >
      <Printer className="h-6 w-6" aria-hidden />
    </button>
  );
}
