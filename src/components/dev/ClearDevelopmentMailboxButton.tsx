'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ClearDevelopmentMailboxButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearMailbox() {
    if (disabled || clearing) return;
    setClearing(true);
    setError(null);
    try {
      const response = await fetch('/api/dev/mailbox', { method: 'DELETE' });
      if (!response.ok) {
        setError('No se pudo vaciar el buzón.');
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo vaciar el buzón.');
    } finally {
      setClearing(false);
    }
  }

  return <div className="flex flex-col items-end gap-2">
    <button
      type="button"
      onClick={clearMailbox}
      disabled={disabled || clearing}
      className="min-h-11 rounded-xl border border-white/20 px-4 py-2 font-semibold text-white transition hover:border-naranja-light hover:text-naranja-light disabled:cursor-not-allowed disabled:opacity-50"
    >
      {clearing ? 'Vaciando…' : 'Vaciar buzón'}
    </button>
    {error ? <p role="alert" className="text-sm text-naranja-light">{error}</p> : null}
  </div>;
}
