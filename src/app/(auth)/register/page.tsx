'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';
import { AUTH_MESSAGES, registrationErrorMessage } from '@/lib/auth-error-messages';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, passwordConfirmation }),
      });
      if (!response.ok) {
        setError(registrationErrorMessage());
        return;
      }
      setCompleted(true);
    } catch {
      setError(registrationErrorMessage());
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
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-naranja">Propea Group</p>
          {completed ? (
            <div className="mt-2">
              <h1 className="text-3xl font-bold text-text-primary">Revisá tu correo</h1>
              <AuthFeedback
                message={AUTH_MESSAGES.registrationSucceeded}
                tone="success"
                className="mt-3"
                focusOnMount
              />
              <p className="mt-4 text-sm text-text-secondary">
                Si corresponde, vas a recibir un enlace de un solo uso para verificar la cuenta.
              </p>
              <Link
                className="mt-6 inline-flex w-full justify-center rounded-xl bg-verde px-4 py-3 font-semibold text-surface transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light"
                href="/login"
              >
                Volver al ingreso
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-bold text-text-primary">Crear cuenta</h1>
              <p className="mt-2 text-sm text-text-secondary">
                Creá tu cuenta personal y verificá el correo antes de ingresar.
              </p>
              <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="nombre">
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-naranja focus:ring-2 focus:ring-naranja-light"
                    placeholder="Tu nombre"
                  />
                </div>
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
                    className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-naranja focus:ring-2 focus:ring-naranja-light"
                    placeholder="tu@email.com"
                  />
                </div>
                <PasswordField
                  id="password"
                  label="Contraseña"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  accent="naranja"
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordField
                  id="passwordConfirmation"
                  label="Confirmar contraseña"
                  value={passwordConfirmation}
                  onChange={setPasswordConfirmation}
                  autoComplete="new-password"
                  accent="naranja"
                  minLength={8}
                />
                <AuthFeedback message={error} tone="error" className="" focusOnMount />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  aria-disabled={loading}
                  className="w-full rounded-xl bg-naranja px-4 py-3 font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover focus:outline-none focus:ring-2 focus:ring-naranja-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </motion.button>
              </form>
              <p className="mt-6 text-sm text-text-secondary">
                ¿Ya tenés cuenta?{' '}
                <Link className="font-semibold text-verde hover:text-verde-hover" href="/login">
                  Iniciá sesión
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}
