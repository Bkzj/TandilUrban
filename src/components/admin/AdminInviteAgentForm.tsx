'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminInviteAgentForm({ tenants }: { tenants: Array<{ id: string; nombreAgencia: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loading) return;
    const form = event.currentTarget; const values = new FormData(form); setLoading(true); setFeedback(null);
    try {
      const response = await fetch('/api/admin/agentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inmobiliariaId: values.get('inmobiliariaId'), nombre: values.get('nombre'), email: values.get('email') }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string; invitationDeliverySucceeded?: boolean };
      if (!response.ok) { setFeedback({ text: body.error ?? 'No se pudo invitar al agente.', error: true }); return; }
      form.reset(); setFeedback({ text: body.invitationDeliverySucceeded ? 'Agente invitado correctamente.' : 'Agente creado; la invitación quedó pendiente de entrega.', error: false }); router.refresh();
    } catch { setFeedback({ text: 'No se pudo conectar con el servidor.', error: true }); }
    finally { setLoading(false); }
  }
  const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-text-primary/70 px-4 text-white focus:border-naranja focus:outline-none';
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 sm:grid-cols-3"><div className="sm:col-span-3"><h2 className="text-2xl font-semibold">Invitar agente</h2><p className="mt-1 text-sm text-white/65">La inmobiliaria se selecciona aquí; el rol AGENTE se fuerza en el servidor.</p></div><label className="space-y-2"><span className="text-sm font-semibold">Inmobiliaria</span><select className={field} name="inmobiliariaId" required><option value="">Seleccionar</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.nombreAgencia}</option>)}</select></label><label className="space-y-2"><span className="text-sm font-semibold">Nombre</span><input className={field} name="nombre" required /></label><label className="space-y-2"><span className="text-sm font-semibold">Email</span><input className={field} name="email" type="email" required /></label>{feedback ? <p role={feedback.error ? 'alert' : 'status'} className={`sm:col-span-3 rounded-xl px-4 py-3 text-sm ${feedback.error ? 'text-naranja-light' : 'text-emerald-200'}`}>{feedback.text}</p> : null}<div className="sm:col-span-3 flex justify-end"><button disabled={loading || tenants.length === 0} className="min-h-11 rounded-xl bg-naranja px-5 font-semibold disabled:opacity-50">{loading ? 'Enviando…' : 'Invitar agente'}</button></div></form>;
}
