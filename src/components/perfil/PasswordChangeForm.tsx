'use client';

import { FormEvent, useState } from 'react';
import { signOut } from 'next-auth/react';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);
    if (newPassword !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, passwordConfirmation }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? 'No pudimos cambiar la contraseña.');
        return;
      }
      setMessage(payload.message ?? 'Contraseña actualizada. Iniciá sesión nuevamente.');
      await signOut({ callbackUrl: '/login?passwordChanged=1' });
    } catch {
      setError('No pudimos cambiar la contraseña. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={onSubmit}>
      <PasswordField
        id="currentPassword"
        label="Contraseña actual"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        accent="verde"
        maxLength={128}
      />
      <PasswordField
        id="newPassword"
        label="Nueva contraseña"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        accent="verde"
        minLength={8}
        maxLength={128}
      />
      <PasswordField
        id="passwordConfirmation"
        label="Confirmar nueva contraseña"
        value={passwordConfirmation}
        onChange={setPasswordConfirmation}
        autoComplete="new-password"
        accent="verde"
        minLength={8}
        maxLength={128}
      />
      <AuthFeedback message={message} tone="success" className="" focusOnMount />
      <AuthFeedback message={error} tone="error" className="" focusOnMount />
      <button
        type="submit"
        disabled={loading}
        aria-disabled={loading}
        className="w-full rounded-xl bg-verde px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {loading ? 'Cambiando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
