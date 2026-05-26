'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError('Credenciales invalidas. Verifica tu email y contrasena.');
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

            {error ? <p className="text-sm font-medium text-naranja-dark">{error}</p> : null}

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

