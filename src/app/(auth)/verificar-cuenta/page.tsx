'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { VerificationResendForm } from '@/components/auth/VerificationResendForm';
import { AUTH_MESSAGES } from '@/lib/auth-error-messages';

function VerificationResult() {
  const successful = useSearchParams().get('status') === 'success';
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
          <h1 className="mt-2 text-3xl font-bold text-text-primary">
            {successful ? 'Cuenta verificada' : 'No pudimos validar el enlace'}
          </h1>
          <AuthFeedback
            message={successful ? AUTH_MESSAGES.verificationSucceeded : AUTH_MESSAGES.verificationLinkInvalid}
            tone={successful ? 'success' : 'neutral'}
            className="mt-3"
            focusOnMount
          />
          {successful ? (
            <Link
              href="/login"
              className="mt-6 inline-flex w-full justify-center rounded-xl bg-verde px-4 py-3 font-semibold text-surface transition hover:bg-verde-hover focus:outline-none focus:ring-2 focus:ring-verde-light"
            >
              Iniciar sesión
            </Link>
          ) : (
            <>
              <p className="mt-4 text-sm text-text-secondary">Podés solicitar un enlace nuevo.</p>
              <VerificationResendForm />
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">Cargando…</div>}>
      <VerificationResult />
    </Suspense>
  );
}
