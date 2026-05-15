'use client';

import { useState } from 'react';

type Props = {
  propiedadId: string;
};

export function PropiedadContactoForm({ propiedadId }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, mensaje, propiedadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(typeof data.error === 'string' ? data.error : 'No se pudo enviar.');
        setStatus('error');
        return;
      }
      setStatus('ok');
      setNombre('');
      setEmail('');
      setMensaje('');
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.');
      setStatus('error');
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {status === 'ok' ? (
        <p className="rounded-xl bg-verde-light/40 px-4 py-3 text-sm font-medium text-verde-dark">
          Consulta enviada. Te contactamos a la brevedad.
        </p>
      ) : null}
      {status === 'error' && errorMsg ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</p>
      ) : null}
      <input
        type="text"
        required
        minLength={3}
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde"
      />
      <input
        type="email"
        required
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde"
      />
      <textarea
        required
        minLength={10}
        placeholder="Hola, me gustaría recibir más información..."
        rows={4}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        className="w-full rounded-xl border border-border-light bg-background p-4 text-text-primary outline-none transition-all placeholder:text-text-secondary focus:ring-2 focus:ring-verde"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-xl bg-verde py-4 font-bold text-surface shadow-lg transition-all hover:bg-verde-hover disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando…' : 'Enviar consulta'}
      </button>
    </form>
  );
}
