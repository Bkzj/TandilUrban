'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';

type SessionView = {
  id: string;
  browser: string;
  operatingSystem: string;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

type SessionsPayload = { sessions: SessionView[]; requiresSecondFactor: boolean };

function relativeActivity(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (elapsed < 60_000) return 'Ahora';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value));
}

export function SessionManagementPanel() {
  const [payload, setPayload] = useState<SessionsPayload | null>(null);
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'others' | 'all' | null>(null);
  const [password, setPassword] = useState('');
  const [factor, setFactor] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);

  const loadSessions = useCallback(async () => {
    const response = await fetch('/api/auth/sessions', { cache: 'no-store' });
    if (!response.ok) throw new Error('No pudimos consultar tus sesiones.');
    setPayload(await response.json() as SessionsPayload);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/sessions', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<SessionsPayload> : Promise.reject())
      .then((sessions) => { if (active) setPayload(sessions); })
      .catch(() => { if (active) setFeedback({ message: 'No pudimos consultar tus sesiones.', tone: 'error' }); });
    return () => { active = false; };
  }, []);

  async function revokeSession(sessionId: string) {
    setLoading(true); setFeedback(null);
    try {
      const response = await fetch('/api/auth/sessions/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error('No pudimos cerrar esa sesión.');
      setConfirmSessionId(null);
      await loadSessions();
      setFeedback({ message: 'La sesión seleccionada fue cerrada.', tone: 'success' });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'No pudimos cerrar esa sesión.', tone: 'error' });
    } finally { setLoading(false); }
  }

  async function revokeBulk(event: FormEvent) {
    event.preventDefault();
    if (!bulkAction) return;
    setLoading(true); setFeedback(null);
    try {
      const endpoint = bulkAction === 'others' ? 'revoke-others' : 'revoke-all';
      const body = payload?.requiresSecondFactor ? { password, factor, code } : { password };
      const response = await fetch(`/api/auth/sessions/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'No pudimos cerrar las sesiones.');
      setPassword(''); setCode(''); setBulkAction(null);
      if (bulkAction === 'all') {
        await signOut({ callbackUrl: '/login?sessionsClosed=1' });
        return;
      }
      await loadSessions();
      setFeedback({ message: 'Las demás sesiones fueron cerradas. Esta sesión continúa activa.', tone: 'success' });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'No pudimos cerrar las sesiones.', tone: 'error' });
    } finally { setLoading(false); }
  }

  if (!payload) return <p className="mt-6 text-sm text-gray-500" role="status">Cargando sesiones…</p>;

  return (
    <div className="mt-6 space-y-5">
      <ul className="divide-y divide-gray-100" aria-label="Sesiones activas">
        {payload.sessions.map((session) => (
          <li key={session.id} className="py-4 first:pt-0">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-gray-900">{session.browser} en {session.operatingSystem}</p>
                <p className="mt-1 text-sm text-gray-500">Última actividad: {relativeActivity(session.lastSeenAt)}</p>
                <p className="text-xs text-gray-400">Creada: {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(session.issuedAt))}</p>
                {session.current ? <p className="mt-1 text-sm font-semibold text-verde">Esta sesión</p> : null}
              </div>
              {!session.current ? (
                confirmSessionId === session.id ? (
                  <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmar cierre de ${session.browser} en ${session.operatingSystem}`}>
                    <button type="button" disabled={loading} onClick={() => void revokeSession(session.id)} className="min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-300">Confirmar cierre</button>
                    <button type="button" onClick={() => setConfirmSessionId(null)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
                  </div>
                ) : <button type="button" onClick={() => setConfirmSessionId(session.id)} className="min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-verde-light">Cerrar sesión</button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <AuthFeedback message={feedback?.message ?? null} tone={feedback?.tone ?? 'error'} className="" focusOnMount />

      {!bulkAction ? (
        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
          <button type="button" onClick={() => { setBulkAction('others'); setFactor('totp'); }} className="min-h-11 rounded-xl border border-verde px-4 py-2 font-semibold text-verde focus:outline-none focus:ring-2 focus:ring-verde-light">Cerrar todas las demás sesiones</button>
          <button type="button" onClick={() => { setBulkAction('all'); setFactor('totp'); }} className="min-h-11 rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">Cerrar todas las sesiones</button>
        </div>
      ) : (
        <form onSubmit={revokeBulk} className="space-y-4 rounded-xl border border-gray-200 p-5" aria-labelledby="session-bulk-heading">
          <h3 id="session-bulk-heading" className="font-bold text-gray-900">{bulkAction === 'others' ? 'Cerrar todas las demás sesiones' : 'Cerrar todas las sesiones'}</h3>
          <p className="text-sm text-gray-600">{bulkAction === 'others' ? 'Esta sesión seguirá activa.' : 'También se cerrará esta sesión y tendrás que volver a ingresar.'}</p>
          <PasswordField id="sessionManagementPassword" label="Contraseña actual" value={password} onChange={setPassword} autoComplete="current-password" accent="verde" maxLength={128} />
          {payload.requiresSecondFactor ? <>
            <button type="button" onClick={() => { setFactor(factor === 'totp' ? 'recovery' : 'totp'); setCode(''); }} className="text-sm font-semibold text-naranja focus:outline-none focus:ring-2 focus:ring-naranja-light">{factor === 'totp' ? 'Usar código de recuperación' : 'Usar código del autenticador'}</button>
            <label htmlFor="sessionManagementCode" className="block text-sm font-medium text-gray-700">{factor === 'totp' ? 'Código del autenticador' : 'Código de recuperación'}</label>
            <input id="sessionManagementCode" required autoComplete="one-time-code" inputMode={factor === 'totp' ? 'numeric' : 'text'} value={code} onChange={(event) => setCode(event.target.value)} maxLength={64} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono outline-none focus:border-verde focus:ring-2 focus:ring-verde/20" />
          </> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-verde px-5 py-2 font-semibold text-white disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-verde-light">{loading ? 'Cerrando…' : 'Confirmar'}</button>
            <button type="button" onClick={() => { setBulkAction(null); setPassword(''); setCode(''); }} className="min-h-11 rounded-xl px-4 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
