'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';

export function InvitationActivationForm({ token, invitation }: { token: string; invitation: { inmobiliariaName: string; role: 'INMOBILIARIA' | 'AGENTE' } | null }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirmation: confirmation }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(body.error ?? 'La invitación no es válida o venció.');
        return;
      }
      setPassword('');
      setConfirmation('');
      setCompleted(true);
      setMessage(body.message ?? 'Cuenta activada. Ya podés iniciar sesión.');
    } catch {
      setMessage('No se pudo completar la activación. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Cuenta configurada correctamente</h1>
        <AuthFeedback message={message} tone="success" className="mt-4" focusOnMount />
        <Link href="/login" className="mt-6 inline-flex w-full justify-center rounded-xl bg-verde px-4 py-3 font-semibold text-surface transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Bienvenido a Propea Group</h1>
        {invitation ? <p className="mt-2 text-sm text-text-secondary">Fuiste invitado a {invitation.role === 'INMOBILIARIA' ? 'administrar' : 'integrar'} <strong className="text-text-primary">{invitation.inmobiliariaName}</strong>. Configurá tu contraseña para comenzar.</p> : <p className="mt-2 text-sm text-text-secondary">La invitación no es válida o venció. Solicitá un nuevo enlace al administrador.</p>}
      </div>
      <PasswordField id="invitation-password" label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password" accent="naranja" minLength={8} />
      <PasswordField id="invitation-confirmation" label="Confirmar contraseña" value={confirmation} onChange={setConfirmation} autoComplete="new-password" accent="naranja" minLength={8} />
      <AuthFeedback message={message} tone="error" className="" focusOnMount />
      <button type="submit" disabled={loading || token.length === 0 || !invitation} className="w-full rounded-xl bg-naranja px-4 py-3 font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover focus:outline-none focus:ring-2 focus:ring-naranja-light disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Activando…' : 'Activar cuenta'}
      </button>
    </form>
  );
}
