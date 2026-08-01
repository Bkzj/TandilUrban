'use client';

import { FormEvent, useState } from 'react';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { AUTH_MESSAGES } from '@/lib/auth-error-messages';

export function VerificationResendForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setMessage(response.ok ? AUTH_MESSAGES.resendGeneric : response.status === 429
        ? AUTH_MESSAGES.resendRateLimited
        : AUTH_MESSAGES.resendFailed);
    } catch {
      setMessage(AUTH_MESSAGES.resendFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor="resend-email">
          Email
        </label>
        <input
          id="resend-email"
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
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-verde px-4 py-3 font-semibold text-verde transition hover:bg-verde-light focus:outline-none focus:ring-2 focus:ring-verde-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Solicitando…' : 'Solicitar un nuevo enlace'}
      </button>
      <AuthFeedback message={message} tone="neutral" className="" focusOnMount />
    </form>
  );
}
