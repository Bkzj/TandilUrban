'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { AUTH_MESSAGES } from '@/lib/auth-error-messages';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) setMessage(AUTH_MESSAGES.passwordResetRequested);
      else if (response.status === 429) setError('Alcanzaste el límite de solicitudes. Intentá más tarde.');
      else setError('No pudimos procesar la solicitud. Intentá nuevamente.');
    } catch {
      setError('No pudimos procesar la solicitud. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-verde-dark via-verde to-text-primary px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-verde">Propea Group</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ingresá tu correo y, si corresponde, recibirás un enlace de un solo uso.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-verde focus:ring-2 focus:ring-verde-light"
                placeholder="tu@email.com"
              />
            </div>
            <AuthFeedback message={message} tone="success" className="" focusOnMount />
            <AuthFeedback message={error} tone="error" className="" focusOnMount />
            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full rounded-xl bg-verde px-4 py-3 font-semibold text-surface shadow-lg shadow-verde/30 transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
          <Link className="mt-6 inline-flex text-sm font-semibold text-naranja hover:text-naranja-hover" href="/login">
            Volver al ingreso
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
