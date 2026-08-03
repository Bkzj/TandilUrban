'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminAccountStatusButton({ userId, active, canActivate }: { userId: string; active: boolean; canActivate: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function update() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/usuarios/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, activo: !active }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) { setError(body.error ?? 'No se pudo actualizar.'); return; }
      router.refresh();
    } catch { setError('No se pudo conectar.'); }
    finally { setLoading(false); }
  }
  return <span className="inline-flex flex-col items-end gap-1"><button type="button" onClick={update} disabled={loading || (!active && !canActivate)} className="min-h-10 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-naranja/60 hover:bg-white/10 disabled:opacity-50">{loading ? 'Actualizando…' : active ? 'Desactivar' : 'Activar'}</button>{error ? <span role="alert" className="max-w-48 text-xs text-naranja-light">{error}</span> : null}</span>;
}
