'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';

const INVALID_MESSAGE = 'No pudimos restablecer la contraseña. El enlace no es válido o venció.';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirmation }),
      });
      if (response.ok) {
        setCompleted(true);
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(response.status === 409 ? payload.error ?? INVALID_MESSAGE : INVALID_MESSAGE);
    } catch {
      setError(INVALID_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-naranja">Propea Group</p>
          {completed ? (
            <div className="mt-2">
              <h1 className="text-3xl font-bold text-text-primary">Contraseña actualizada</h1>
              <AuthFeedback
                message="Ya podés volver a iniciar sesión con tu nueva contraseña."
                tone="success"
                className="mt-3"
                focusOnMount
              />
              <Link
                href="/login?passwordChanged=1"
                className="mt-6 inline-flex w-full justify-center rounded-xl bg-verde px-4 py-3 font-semibold text-surface transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light"
              >
                Ir al login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-bold text-text-primary">Nueva contraseña</h1>
              <p className="mt-2 text-sm text-text-secondary">Elegí una contraseña nueva para tu cuenta.</p>
              <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                <PasswordField
                  id="password"
                  label="Nueva contraseña"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  accent="naranja"
                  minLength={8}
                  maxLength={128}
                />
                <PasswordField
                  id="passwordConfirmation"
                  label="Confirmar contraseña"
                  value={passwordConfirmation}
                  onChange={setPasswordConfirmation}
                  autoComplete="new-password"
                  accent="naranja"
                  minLength={8}
                  maxLength={128}
                />
                <AuthFeedback message={error} tone="error" className="" focusOnMount />
                <button
                  type="submit"
                  disabled={loading}
                  aria-disabled={loading}
                  className="w-full rounded-xl bg-naranja px-4 py-3 font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover focus:outline-none focus:ring-2 focus:ring-naranja-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">Cargando…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
