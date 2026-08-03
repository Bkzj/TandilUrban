'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ResendInvitationButton({ inmobiliariaId }: { inmobiliariaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  async function resend() {
    if (loading) return;
    setLoading(true); setFeedback(null);
    try {
      const response = await fetch(`/api/admin/inmobiliarias/${encodeURIComponent(inmobiliariaId)}/invitacion`, { method: 'POST' });
      const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      setFeedback({ message: response.ok ? body.message ?? 'Invitación reenviada.' : body.error ?? 'No se pudo reenviar la invitación.', error: !response.ok });
      if (response.ok) router.refresh();
    } catch { setFeedback({ message: 'No se pudo conectar con el servidor.', error: true }); }
    finally { setLoading(false); }
  }
  return <div><button type="button" onClick={resend} disabled={loading} className="min-h-11 rounded-xl bg-naranja px-5 py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Reenviando…' : 'Reenviar invitación'}</button>{feedback ? <p role={feedback.error ? 'alert' : 'status'} className={`mt-3 text-sm ${feedback.error ? 'text-naranja-light' : 'text-emerald-200'}`}>{feedback.message}</p> : null}</div>;
}
