'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateInmobiliariaForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setLoading(true); setFeedback(null);
    try {
      const response = await fetch('/api/admin/inmobiliarias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombreAgencia: values.get('nombreAgencia'), cuit: values.get('cuit'), direccion: values.get('direccion'), administrador: { nombre: values.get('nombre'), email: values.get('email') } }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string; invitationDeliverySucceeded?: boolean };
      if (!response.ok) { setFeedback({ text: body.error ?? 'No se pudo crear la inmobiliaria.', error: true }); return; }
      form.reset();
      setFeedback({ text: body.invitationDeliverySucceeded ? 'Inmobiliaria creada e invitación enviada.' : 'Inmobiliaria creada. La invitación quedó pendiente de entrega.', error: false });
      router.refresh();
    } catch { setFeedback({ text: 'No se pudo conectar con el servidor.', error: true }); }
    finally { setLoading(false); }
  }
  const inputClass = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 focus:border-naranja focus:outline-none focus:ring-2 focus:ring-naranja/30';
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 sm:grid-cols-2" aria-label="Crear inmobiliaria">
      <div className="sm:col-span-2"><h2 className="text-2xl font-semibold">Nueva inmobiliaria</h2><p className="mt-1 text-sm text-white/65">El administrador recibirá un enlace de un solo uso para elegir su contraseña.</p></div>
      <label className="space-y-2"><span className="text-sm font-semibold">Nombre de la inmobiliaria</span><input className={inputClass} name="nombreAgencia" required minLength={2} /></label>
      <label className="space-y-2"><span className="text-sm font-semibold">CUIT</span><input className={inputClass} name="cuit" required /></label>
      <label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold">Dirección</span><input className={inputClass} name="direccion" required /></label>
      <label className="space-y-2"><span className="text-sm font-semibold">Nombre del administrador</span><input className={inputClass} name="nombre" autoComplete="name" required /></label>
      <label className="space-y-2"><span className="text-sm font-semibold">Email del administrador</span><input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
      {feedback ? <p role={feedback.error ? 'alert' : 'status'} className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${feedback.error ? 'border border-naranja/40 bg-naranja/10 text-naranja-light' : 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-100'}`}>{feedback.text}</p> : null}
      <div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-naranja px-5 py-3 font-semibold text-white shadow-lg shadow-naranja/25 disabled:opacity-60">{loading ? 'Creando…' : 'Crear inmobiliaria'}</button></div>
    </form>
  );
}
