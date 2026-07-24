'use client';

import { useCallback, useState, useTransition } from 'react';
import { Heart } from 'lucide-react';

import { toggleFavorito } from '@/actions/favoritos';

type FavoriteButtonProps = {
  propiedadId: string;
  isFavoritoInicial: boolean;
  className?: string;
};

export function FavoriteButton({
  propiedadId,
  isFavoritoInicial,
  className = '',
}: FavoriteButtonProps) {
  const [isFavorito, setIsFavorito] = useState(isFavoritoInicial);
  const [isAnimating, setIsAnimating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const pulseHeart = useCallback(() => {
    setIsAnimating(true);
    window.setTimeout(() => setIsAnimating(false), 300);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const next = !isFavorito;
      setIsFavorito(next);
      if (next) pulseHeart();

      startTransition(async () => {
        const result = await toggleFavorito(propiedadId);

        if ('error' in result) {
          setIsFavorito(!next);
          if (result.error === 'requires_login') {
            showToast('Iniciá sesión para guardar favoritos');
            return;
          }
          showToast(result.error);
          return;
        }

        setIsFavorito(result.isFavorito);
      });
    },
    [isFavorito, propiedadId, pulseHeart, showToast],
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        aria-pressed={isFavorito}
        className="flex items-center justify-center rounded-full bg-white/80 p-2.5 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        <Heart
          className={`h-6 w-6 transition-transform duration-200 ease-out ${
            isAnimating ? 'scale-125' : 'scale-100'
          } ${
            isFavorito
              ? 'fill-red-500 text-red-500 hover:fill-red-600 hover:text-red-600'
              : 'text-gray-500 hover:text-red-500'
          }`}
          aria-hidden
        />
      </button>
      {toast ? (
        <span
          role="status"
          className="absolute right-0 top-full z-30 mt-2 max-w-[14rem] rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium leading-snug text-white shadow-lg"
        >
          {toast}
        </span>
      ) : null}
    </div>
  );
}
