'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoading(false);
      setError(result.error ?? 'No se pudo crear la cuenta.');
      return;
    }

    const login = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/',
    });

    setLoading(false);

    if (login?.error) {
      router.push('/login');
      return;
    }

    router.push(login?.url ?? '/');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-8 shadow-2xl backdrop-blur"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-naranja">Propea Group</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Crear cuenta</h1>
          <p className="mt-2 text-sm text-text-secondary">Empieza a gestionar propiedades con una experiencia premium.</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="nombre">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                required
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
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-naranja focus:ring-2 focus:ring-naranja-light"
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
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border-light bg-background px-4 py-3 text-text-primary outline-none transition focus:border-naranja focus:ring-2 focus:ring-naranja-light"
                placeholder="Minimo 8 caracteres"
              />
            </div>

            {error ? <p className="text-sm font-medium text-naranja-dark">{error}</p> : null}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-naranja px-4 py-3 font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </motion.button>
          </form>

          <p className="mt-6 text-sm text-text-secondary">
            Ya tienes cuenta?{' '}
            <Link className="font-semibold text-verde hover:text-verde-hover" href="/login">
              Inicia sesion
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

