'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  propiedadId: string;
  /** Icono solo en tabla (histórico), botón full en modal, o enlace sutil */
  variant?: 'icon' | 'full' | 'link';
  /** Tras DELETE exitoso (ej. cerrar Quick View antes del refresh). */
  onSuccess?: () => void;
  /** Solo `variant="full"`: clases extra (se aplican tras el estilo base). */
  className?: string;
};

export async function confirmDeletePropiedad(propiedadId: string): Promise<{ ok: boolean; error?: string }> {
  if (!window.confirm('¿Estás seguro de eliminar esta propiedad?')) return { ok: false };
  const res = await fetch(`/api/panel/propiedades/${propiedadId}`, { method: 'DELETE' });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  const error = typeof data.error === 'string' ? data.error : 'No se pudo eliminar.';
  window.alert(error);
  return { ok: false, error };
}

export function DeletePropertyButton({
  propiedadId,
  variant = 'icon',
  onSuccess,
  className,
}: Props) {
  const router = useRouter();

  async function handleClick() {
    const r = await confirmDeletePropiedad(propiedadId);
    if (!r.ok) return;
    onSuccess?.();
    router.refresh();
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`mx-auto mt-1 cursor-pointer text-xs font-medium tracking-wide text-red-400/60 transition-colors hover:text-red-400 hover:underline underline-offset-4 ${className ?? ''}`}
      >
        Eliminar propiedad
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`w-full rounded-xl border border-white/10 !bg-red-500 py-3 text-sm font-bold !text-white shadow-lg shadow-black/20 transition-colors hover:!bg-red-500 ${className ?? ''}`}
      >
        Eliminar
      </button>
    );
  }

  return (
    <button
      type="button"
      title="Eliminar propiedad"
      onClick={() => void handleClick()}
      className="flex items-center justify-center rounded-xl p-2 transition-colors !text-surface/50 hover:!bg-red-500/10 hover:!text-red-500"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
