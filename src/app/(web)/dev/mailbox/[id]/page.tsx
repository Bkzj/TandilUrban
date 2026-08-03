import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDevelopmentEmail, isDevelopmentMailboxAvailable } from '@/server/development-mailbox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Correo capturado | Propea Group', robots: { index: false, follow: false } };

export default async function DevelopmentMailboxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDevelopmentMailboxAvailable()) notFound();
  const { id } = await params;
  const message = getDevelopmentEmail(id);
  if (!message) notFound();

  return <main className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark px-4 py-10 text-white sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Link href="/dev/mailbox" className="text-sm font-semibold text-naranja-light">← Volver al buzón</Link>
      <header className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Solo desarrollo</p>
        <h1 className="mt-2 break-words text-3xl font-semibold">{message.subject}</h1>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-white/50">Destinatario</dt><dd className="mt-1 break-all">{message.to}</dd></div>
          <div><dt className="text-white/50">Fecha</dt><dd className="mt-1">{message.createdAt.toLocaleString('es-AR')}</dd></div>
          <div><dt className="text-white/50">Plantilla</dt><dd className="mt-1">{message.template}</dd></div>
          <div><dt className="text-white/50">Identificador de entrega</dt><dd className="mt-1 break-all font-mono text-xs">{message.correlationId}</dd></div>
        </dl>
        {message.actionUrl ? <a href={message.actionUrl} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-naranja px-5 py-3 font-semibold text-white shadow-lg shadow-naranja/25">Abrir invitación</a> : null}
      </header>

      <section className="mt-8" aria-labelledby="html-preview">
        <h2 id="html-preview" className="text-xl font-semibold">Vista HTML de marca</h2>
        <p className="mt-1 text-sm text-white/60">La vista se ejecuta en un marco aislado sin scripts.</p>
        <iframe title={`Vista previa: ${message.subject}`} sandbox="" referrerPolicy="no-referrer" srcDoc={message.html} className="mt-4 h-[720px] w-full rounded-2xl border border-white/15 bg-white shadow-xl" />
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20" aria-labelledby="text-preview">
        <h2 id="text-preview" className="text-xl font-semibold">Alternativa de texto plano</h2>
        {message.text ? <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-white/75">{message.text}</pre> : <p className="mt-4 text-sm text-white/55">Este correo no incluye una alternativa de texto plano.</p>}
      </section>
    </div>
  </main>;
}
