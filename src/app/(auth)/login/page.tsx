'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';
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
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [secondFactor, setSecondFactor] = useState<'totp' | 'recovery'>('totp');
  const [secondFactorCode, setSecondFactorCode] = useState('');

  const verified = searchParams.get('verified') === '1';
  const passwordChanged = searchParams.get('passwordChanged') === '1';
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
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const primaryResponse = await fetch('/api/auth/two-factor/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!primaryResponse.ok) {
        setError(authenticationErrorMessage());
        return;
      }
      const primary = (await primaryResponse.json()) as { requiresTwoFactor: boolean; challengeToken?: string };
      if (primary.requiresTwoFactor) {
        if (!primary.challengeToken) throw new Error('missing challenge');
        setPassword('');
        setChallengeToken(primary.challengeToken);
        setSecondFactor('totp');
        setSecondFactorCode('');
        return;
      }
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError(authenticationErrorMessage());
        return;
      }
      const safeDestination = safeInternalCallbackUrl(
        result?.url ?? callbackUrl,
        window.location.origin,
      );
      const parsedDestination = new URL(safeDestination, window.location.origin);
      router.push(`${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`);
      router.refresh();
    } catch {
      setError(authenticationErrorMessage());
    } finally {
      setLoading(false);
    }
  }

  async function submitSecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !challengeToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn('two-factor', {
        challengeToken,
        factor: secondFactor,
        code: secondFactorCode,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError('No pudimos validar el código. Intentá nuevamente o volvé a iniciar sesión.');
        return;
      }
      const destination = new URL(safeInternalCallbackUrl(result?.url ?? callbackUrl, window.location.origin), window.location.origin);
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      router.refresh();
    } catch {
      setError('No pudimos validar el código. Intentá nuevamente o volvé a iniciar sesión.');
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
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-verde">Propea Group</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">
            {challengeToken ? 'Verificación en dos pasos' : 'Iniciar sesión'}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {challengeToken
              ? secondFactor === 'totp'
                ? 'Ingresá el código de 6 dígitos de tu aplicación autenticadora.'
                : 'Ingresá uno de tus códigos de recuperación.'
              : 'Accedé con tu correo y contraseña.'}
          </p>
          <AuthFeedback
            message={verified ? AUTH_MESSAGES.verificationSucceeded : null}
            tone="success"
          />
          <AuthFeedback
            message={passwordChanged ? AUTH_MESSAGES.passwordChanged : null}
            tone="success"
          />
          <AuthFeedback
            message={verificationError ? AUTH_MESSAGES.verificationLinkInvalid : null}
            tone="neutral"
          />

          {challengeToken ? (
          <form className="mt-8 space-y-4" onSubmit={submitSecondFactor}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="secondFactorCode">
                {secondFactor === 'totp' ? 'Código del autenticador' : 'Código de recuperación'}
              </label>
              <input
                id="secondFactorCode"
                name="secondFactorCode"
                type="text"
                required
                autoComplete="one-time-code"
                inputMode={secondFactor === 'totp' ? 'numeric' : 'text'}
                value={secondFactorCode}
                onChange={(event) => setSecondFactorCode(event.target.value)}
                maxLength={secondFactor === 'totp' ? 16 : 64}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 font-mono text-lg tracking-widest text-text-primary outline-none transition focus:border-verde focus:ring-2 focus:ring-verde-light"
              />
            </div>
            <AuthFeedback message={error} tone="error" className="" focusOnMount />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-verde px-4 py-3 font-semibold text-surface shadow-lg shadow-verde/30 transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light disabled:opacity-70">
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-naranja hover:text-naranja-hover focus:outline-none focus:ring-2 focus:ring-naranja-light"
              onClick={() => { setSecondFactor(secondFactor === 'totp' ? 'recovery' : 'totp'); setSecondFactorCode(''); setError(null); }}
            >
              {secondFactor === 'totp' ? 'Usar un código de recuperación' : 'Usar código del autenticador'}
            </button>
            <button type="button" className="w-full text-sm text-text-secondary underline" onClick={() => { setChallengeToken(null); setSecondFactorCode(''); setError(null); }}>
              Volver a ingresar email y contraseña
            </button>
          </form>
          ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-verde focus:ring-2 focus:ring-verde-light"
                placeholder="tu@email.com"
              />
            </div>

            <PasswordField
              id="password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              accent="verde"
              maxLength={128}
            />

            <div className="text-right">
              <Link
                href="/olvide-mi-contrasena"
                className="text-sm font-semibold text-verde hover:text-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <AuthFeedback message={error} tone="error" className="" focusOnMount />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full rounded-xl bg-verde px-4 py-3 font-semibold text-surface shadow-lg shadow-verde/30 transition hover:bg-verde-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </motion.button>
          </form>
          )}

          {!challengeToken ? <div className="mt-5 border-t border-border-light pt-4">
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
          </div> : null}

          {!challengeToken ? <p className="mt-6 text-sm text-text-secondary">
            ¿No tenés cuenta?{' '}
            <Link className="font-semibold text-naranja hover:text-naranja-hover" href="/register">
              Registrate
            </Link>
          </p> : null}
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
