'use client';

import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';

type PropertyShareButtonProps = {
  title: string;
};

export function PropertyShareButton({ title }: PropertyShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast('Enlace copiado');
    } catch {
      setToast('No se pudo copiar el enlace');
    }

    window.setTimeout(() => setToast(null), 2200);
  }, [title]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-verde/30 hover:bg-verde-light hover:text-verde-dark"
        aria-label="Compartir propiedad"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Compartir
      </button>
      {toast ? (
        <span
          role="status"
          className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </span>
      ) : null}
    </div>
  );
}
