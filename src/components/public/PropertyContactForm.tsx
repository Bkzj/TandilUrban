'use client';

import { FormEvent, useState } from 'react';
import { Check } from 'lucide-react';

type PropertyContactFormProps = {
  propiedadId: string;
};

const QUICK_SUGGESTIONS = [
  '¿Sigue disponible?',
  'Quiero coordinar una visita',
  '¿Aceptan mascotas?',
  '¿Tiene cochera?',
] as const;

const fieldClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-naranja focus:ring-2 focus:ring-naranja';

export function PropertyContactForm({ propiedadId }: PropertyContactFormProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('Hola, me interesa la propiedad...');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function applySuggestion(text: string) {
    setMensaje(text);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const telefonoNorm = telefono.trim();
    if (telefonoNorm.length < 6) {
      setErrorMsg('El teléfono es obligatorio (mínimo 6 caracteres).');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          telefono: telefonoNorm,
          mensaje,
          propiedadId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(typeof data.error === 'string' ? data.error : 'No se pudo enviar.');
        setStatus('error');
        return;
      }
      setStatus('ok');
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-verde/20 bg-verde/10 px-6 py-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-verde/15 text-verde-dark">
          <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
        </div>
        <p className="text-base font-semibold text-verde-dark">
          ¡Consulta enviada! El agente se pondrá en contacto a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 md:text-xl">Contactar al anunciante</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Completá tus datos y te responderemos a la brevedad.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {status === 'error' && errorMsg ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</p>
        ) : null}

        <input
          type="text"
          name="nombre"
          required
          minLength={3}
          placeholder="Nombre"
          autoComplete="name"
          value={nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          className={fieldClass}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className={fieldClass}
        />
        <div>
          <input
            type="tel"
            name="telefono"
            required
            minLength={6}
            placeholder="Teléfono (Solo para contactarte por WhatsApp, sin spam)"
            autoComplete="tel"
            value={telefono}
            onChange={(ev) => setTelefono(ev.target.value)}
            className={fieldClass}
            aria-describedby="contacto-telefono-ayuda"
          />
          <p id="contacto-telefono-ayuda" className="mt-1.5 text-xs text-gray-500">
            Solo para contactarte por WhatsApp, sin spam.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="shrink-0 rounded-full border border-transparent bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition-all hover:border-naranja hover:bg-naranja hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <textarea
          name="mensaje"
          required
          minLength={10}
          rows={4}
          placeholder="Tu mensaje"
          value={mensaje}
          onChange={(ev) => setMensaje(ev.target.value)}
          className={`${fieldClass} resize-y`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-xl bg-verde py-3.5 text-sm font-semibold text-white transition-colors hover:bg-verde/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {status === 'loading' ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </form>
    </div>
  );
}
