'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { AUTH_MESSAGES, authenticationErrorMessage } from '@/lib/auth-error-messages';
import { safeInternalCallbackUrl } from '@/lib/validation/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeInternalCallbackUrl(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const verified = searchParams.get('verified') === '1';
  const verificationError = searchParams.get('error');

  async function resendVerification() {
    if (resendPending || !email.trim()) return;
    setResendPending(true);
    setResendMessage(null);
    setRetryAfter(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After') ?? '60');
        setRetryAfter(Number.isFinite(seconds) ? seconds : 60);
        setResendMessage(AUTH_MESSAGES.resendRateLimited);
      } else if (response.ok) {
        setResendMessage(payload.message ?? AUTH_MESSAGES.resendGeneric);
      } else {
        setResendMessage(AUTH_MESSAGES.resendFailed);
      }
    } finally {
      setResendPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError(authenticationErrorMessage());
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-verde-dark via-verde to-text-primary px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-8 shadow-2xl backdrop-blur"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-verde">Propea Group</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-text-secondary">Accede al panel con tus credenciales.</p>
          <AuthFeedback
            message={verified ? AUTH_MESSAGES.verificationSucceeded : null}
            tone="success"
          />
          <AuthFeedback
            message={verificationError ? AUTH_MESSAGES.verificationLinkInvalid : null}
            tone="neutral"
          />

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-verde focus:ring-2 focus:ring-verde-light"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-verde focus:ring-2 focus:ring-verde-light"
                placeholder="••••••••"
              />
            </div>

            <AuthFeedback message={error} tone="error" className="" />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-verde px-4 py-3 font-semibold text-surface shadow-lg shadow-verde/30 transition hover:bg-verde-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </motion.button>
          </form>

          <div className="mt-5 border-t border-border-light pt-4">
            <p className="text-sm text-text-secondary">¿Todavía no verificaste tu correo?</p>
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={resendPending || !email.trim()}
              className="mt-2 text-sm font-semibold text-verde hover:text-verde-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendPending ? 'Enviando…' : 'Reenviar correo de verificación'}
            </button>
            <AuthFeedback message={resendMessage} tone="neutral" className="mt-2" />
            {retryAfter ? <p className="mt-1 text-xs text-text-secondary">Tiempo sugerido de espera: {retryAfter} segundos.</p> : null}
          </div>

          <p className="mt-6 text-sm text-text-secondary">
            No tienes cuenta?{' '}
            <Link className="font-semibold text-naranja hover:text-naranja-hover" href="/register">
              Registrate
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

