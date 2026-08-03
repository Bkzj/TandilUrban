import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClearDevelopmentMailboxButton } from '@/components/dev/ClearDevelopmentMailboxButton';
import { isDevelopmentMailboxAvailable, listDevelopmentEmails } from '@/server/development-mailbox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Buzón de desarrollo | Propea Group', robots: { index: false, follow: false } };

const TEMPLATE_LABELS = {
  account_invitation: 'Invitación de cuenta',
  email_verification: 'Verificación de correo',
  password_reset: 'Recuperación de contraseña',
  password_changed: 'Cambio de contraseña',
  two_factor_notification: 'Seguridad en dos pasos',
  other: 'Correo transaccional',
} as const;

export default function DevelopmentMailboxPage() {
  if (!isDevelopmentMailboxAvailable()) notFound();
  const messages = listDevelopmentEmails();
  return <main className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark px-4 py-10 text-white sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Solo desarrollo</p>
          <h1 className="mt-2 text-4xl font-semibold">Buzón de desarrollo</h1>
          <p className="mt-3 max-w-2xl text-white/65">Correos capturados por el proveedor local. No fueron enviados a un buzón externo.</p>
        </div>
        <ClearDevelopmentMailboxButton disabled={messages.length === 0} />
      </header>

      <section className="mt-8 space-y-3" aria-labelledby="mailbox-messages">
        <h2 id="mailbox-messages" className="text-xl font-semibold">Últimos correos</h2>
        {messages.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-lg shadow-black/20"><p className="text-white/70">Todavía no hay correos capturados.</p><p className="mt-2 text-sm text-white/50">Creá o reenviá una invitación con <code>EMAIL_PROVIDER=sink</code>.</p></div> : null}
        {messages.map((message) => <article key={message.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-naranja-light">{TEMPLATE_LABELS[message.template]}</p>
              <h3 className="mt-1 truncate text-lg font-semibold">{message.subject}</h3>
              <p className="mt-2 break-all text-sm text-white/65">Para: {message.to}</p>
              <p className="mt-1 text-xs text-white/45">{message.createdAt.toLocaleString('es-AR')}</p>
            </div>
            <Link href={`/dev/mailbox/${message.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-naranja px-5 py-3 font-semibold text-white shadow-lg shadow-naranja/25">Ver correo</Link>
          </div>
        </article>)}
      </section>
    </div>
  </main>;
}
