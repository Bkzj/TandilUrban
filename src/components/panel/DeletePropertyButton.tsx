'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  propiedadId: string;
  /** Icono solo en tabla (histórico) o botón full en modal */
  variant?: 'icon' | 'full';
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

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`w-full rounded-xl border border-black/30 !bg-red-500 py-3 text-sm font-bold !text-white transition-colors hover:!bg-red-500 ${className ?? ''}`}
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
      className="flex items-center justify-center rounded-lg p-2 transition-colors !text-surface/50 hover:!text-red-500 hover:!bg-red-500/10"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
