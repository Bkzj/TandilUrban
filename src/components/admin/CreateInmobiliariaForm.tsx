'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type Draft = {
  nombreAgencia: string;
  cuit: string;
  direccion: string;
  administradorNombre: string;
  administradorEmail: string;
};

type CreationResult = { inmobiliariaId: string; invitationDeliverySucceeded: boolean; invitationDeliveryProvider?: string };

const inputClass = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 focus:border-naranja focus:outline-none focus:ring-2 focus:ring-naranja/30';

export function CreateInmobiliariaForm() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresExistingConfirmation, setRequiresExistingConfirmation] = useState(false);
  const [confirmExisting, setConfirmExisting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<CreationResult | null>(null);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setDraft({
      nombreAgencia: String(values.get('nombreAgencia') ?? ''),
      cuit: String(values.get('cuit') ?? ''),
      direccion: String(values.get('direccion') ?? ''),
      administradorNombre: String(values.get('administradorNombre') ?? ''),
      administradorEmail: String(values.get('administradorEmail') ?? ''),
    });
    setFeedback(null);
  }

  async function create() {
    if (!draft || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/inmobiliarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreAgencia: draft.nombreAgencia,
          cuit: draft.cuit,
          direccion: draft.direccion,
          administrador: { nombre: draft.administradorNombre, email: draft.administradorEmail },
          confirmExistingAccount: confirmExisting,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        inmobiliariaId?: string;
        invitationDeliverySucceeded?: boolean;
        invitationDeliveryProvider?: string;
        requiresExistingAccountConfirmation?: boolean;
      };
      if (!response.ok || !body.inmobiliariaId) {
        if (body.requiresExistingAccountConfirmation) {
          setRequiresExistingConfirmation(true);
          setConfirmExisting(false);
        }
        setFeedback(body.error ?? 'No se pudo crear la inmobiliaria.');
        return;
      }
      setResult({ inmobiliariaId: body.inmobiliariaId, invitationDeliverySucceeded: body.invitationDeliverySucceeded === true, invitationDeliveryProvider: body.invitationDeliveryProvider });
    } catch {
      setFeedback('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <section className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-6 shadow-lg shadow-black/20" aria-labelledby="created-title">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Proceso completado</p>
      <h2 id="created-title" className="mt-2 text-3xl font-semibold">Inmobiliaria creada</h2>
      <ul className="mt-5 space-y-3 text-white/80"><li>✓ Inmobiliaria creada</li><li>✓ Administrador creado</li><li>{result.invitationDeliverySucceeded ? result.invitationDeliveryProvider === 'sink' ? '✓ Invitación capturada por el buzón local' : '✓ Invitación enviada' : '• Invitación pendiente de reenvío'}</li></ul>
      {result.invitationDeliverySucceeded && result.invitationDeliveryProvider === 'sink' ? <p role="status" className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/75">Modo desarrollo: el mensaje fue capturado por el sink local y no se envió a un buzón externo.</p> : null}
      {!result.invitationDeliverySucceeded ? <p role="status" className="mt-4 rounded-xl border border-naranja/35 bg-naranja/10 px-4 py-3 text-sm text-naranja-light">Inmobiliaria creada correctamente. No pudimos enviar la invitación al administrador. Podés reenviarla desde el detalle de la inmobiliaria.</p> : null}
      <div className="mt-6 flex flex-wrap gap-3"><Link href={`/admin/inmobiliarias/${result.inmobiliariaId}`} className="rounded-xl bg-naranja px-5 py-3 font-semibold text-white">Ver inmobiliaria</Link>{result.invitationDeliverySucceeded && result.invitationDeliveryProvider === 'sink' ? <Link href="/dev/mailbox" className="rounded-xl border border-naranja-light/50 px-5 py-3 font-semibold text-naranja-light">Abrir buzón local</Link> : null}<Link href="/admin/inmobiliarias" className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white">Volver al listado</Link></div>
    </section>;
  }

  if (draft) {
    return <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20" aria-labelledby="summary-title">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-naranja-light">Confirmación</p>
      <h2 id="summary-title" className="mt-2 text-2xl font-semibold">Vas a crear</h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-white/55">Inmobiliaria</dt><dd className="mt-1 text-lg font-semibold">{draft.nombreAgencia}</dd><dd className="text-sm text-white/65">{draft.cuit} · {draft.direccion}</dd></div><div><dt className="text-sm text-white/55">Administrador</dt><dd className="mt-1 text-lg font-semibold">{draft.administradorNombre}</dd><dd className="text-sm text-white/65">{draft.administradorEmail}</dd></div></dl>
      <p className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">El administrador recibirá un correo personal para configurar su contraseña y activar la cuenta.</p>
      {requiresExistingConfirmation ? <label className="mt-4 flex items-start gap-3 rounded-xl border border-naranja/35 bg-naranja/10 p-4"><input type="checkbox" className="mt-1 size-4 accent-[#957327]" required checked={confirmExisting} onChange={(event) => setConfirmExisting(event.target.checked)} /><span><strong className="block text-naranja-light">La cuenta ya existe</strong><span className="text-sm text-white/75">Confirmo que quiero asignarla como administradora de esta inmobiliaria. Sus sesiones actuales se cerrarán.</span></span></label> : null}
      {feedback ? <p role="alert" className="mt-4 rounded-xl border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-naranja-light">{feedback}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => { setDraft(null); setRequiresExistingConfirmation(false); setConfirmExisting(false); setFeedback(null); }} className="min-h-11 rounded-xl border border-white/20 px-5 py-3 font-semibold">Editar datos</button><button type="button" onClick={create} disabled={loading || (requiresExistingConfirmation && !confirmExisting)} className="min-h-11 rounded-xl bg-naranja px-5 py-3 font-semibold text-white shadow-lg shadow-naranja/25 disabled:opacity-60">{loading ? 'Creando…' : 'Crear inmobiliaria y enviar invitación'}</button></div>
    </section>;
  }

  return <form onSubmit={review} className="space-y-7" aria-label="Crear inmobiliaria">
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 sm:grid-cols-2"><legend className="px-2 text-xl font-semibold">Datos de la inmobiliaria</legend><label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold">Nombre de la inmobiliaria</span><input className={inputClass} name="nombreAgencia" required minLength={2} maxLength={120} /></label><label className="space-y-2"><span className="text-sm font-semibold">CUIT</span><input className={inputClass} name="cuit" required minLength={8} maxLength={24} /></label><label className="space-y-2"><span className="text-sm font-semibold">Dirección</span><input className={inputClass} name="direccion" required minLength={3} maxLength={180} autoComplete="street-address" /></label></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 sm:grid-cols-2"><legend className="px-2 text-xl font-semibold">Administrador de la inmobiliaria</legend><p className="text-sm text-white/65 sm:col-span-2">Esta persona tendrá permisos para administrar la inmobiliaria y crear sus propios agentes.</p><label className="space-y-2"><span className="text-sm font-semibold">Nombre completo</span><input className={inputClass} name="administradorNombre" autoComplete="name" required /></label><label className="space-y-2"><span className="text-sm font-semibold">Email</span><input className={inputClass} name="administradorEmail" type="email" autoComplete="email" required /></label></fieldset>
    <div className="flex justify-end"><button type="submit" className="min-h-11 rounded-xl bg-naranja px-6 py-3 font-semibold text-white shadow-lg shadow-naranja/25">Revisar y continuar</button></div>
  </form>;
}
