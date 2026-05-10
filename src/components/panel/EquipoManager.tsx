'use client';

import { FormEvent, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { Agente } from '@/types/panel';

type Props = {
  /** Hidratación inicial (server-side render). */
  agentes: Agente[];
};

export default function EquipoManager({ agentes: agentesIniciales }: Props) {
  const [agentes, setAgentes] = useState<Agente[]>(agentesIniciales);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setError(null);
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      nombre: String(formData.get('nombre') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
    };

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/panel/equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { agente?: Agente; error?: string };

      if (!res.ok || !json.agente) {
        setError(json.error ?? 'No se pudo crear el agente.');
        return;
      }

      // Actualización optimista: el agente nuevo entra al tope de la lista.
      setAgentes((prev) => [json.agente as Agente, ...prev]);
      form.reset();
      closeForm();
    } catch (err) {
      console.error('[EquipoManager.onCreate]', err);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (pendingDeleteId) return;
    setPendingDeleteId(id);
    setError(null);
    try {
      const res = await fetch(`/api/panel/equipo?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'No se pudo eliminar al agente.');
        return;
      }
      setAgentes((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('[EquipoManager.onDelete]', err);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Sub-header con CTA principal */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Agentes de la agencia</h2>
          <p className="mt-1 text-sm text-surface/65">
            Los agentes operan dentro de tu inmobiliaria con sus propias credenciales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-naranja px-5 py-3 text-sm font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover"
        >
          <span aria-hidden>{showForm ? '×' : '+'}</span>
          {showForm ? 'Cancelar' : 'Añadir agente'}
        </button>
      </div>

      {/* Form inline */}
      <AnimatePresence initial={false}>
        {showForm ? (
          <motion.form
            key="form-create-agente"
            onSubmit={onCreate}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="grid gap-6 rounded-2xl border border-surface/15 bg-surface/5 p-6 backdrop-blur sm:grid-cols-3 md:p-8"
            noValidate
          >
            <SubtleField label="Nombre" name="nombre" autoFocus required minLength={2} placeholder="María López" />
            <SubtleField label="Email" name="email" type="email" required placeholder="agente@tandilprop.com" />
            <SubtleField
              label="Contraseña temporal"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              hint="El agente la podrá cambiar al ingresar."
            />

            {error ? (
              <p className="text-sm font-medium text-naranja-light sm:col-span-3">{error}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-surface/20 px-4 py-2 text-sm text-surface/80 transition hover:border-surface/40 hover:bg-surface/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-naranja px-5 py-2.5 text-sm font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creando…' : 'Crear agente'}
              </button>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {/* Errores fuera del form (delete u otros) */}
      {!showForm && error ? (
        <p className="rounded-xl border border-naranja/40 bg-naranja/10 px-4 py-2 text-sm font-medium text-naranja-light">
          {error}
        </p>
      ) : null}

      {/* Tabla minimalista */}
      <div className="overflow-hidden rounded-2xl border border-surface/10 bg-surface/5 backdrop-blur">
        {agentes.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-surface/65">
            Todavía no agregaste agentes. Pulsá <span className="text-surface">Añadir agente</span> para empezar.
          </p>
        ) : (
          <table className="w-full text-left text-sm text-surface/85">
            <thead className="border-b border-surface/10 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/55">
              <tr>
                <th className="px-6 py-4 font-medium">Agente</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Alta</th>
                <th className="px-6 py-4 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-surface/10 transition-colors last:border-b-0 hover:bg-surface/[0.04]"
                >
                  <td className="px-6 py-4 font-semibold text-white">{a.nombre}</td>
                  <td className="px-6 py-4 text-surface/75">{a.email}</td>
                  <td className="px-6 py-4 text-surface/55">
                    {new Date(a.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      disabled={pendingDeleteId === a.id}
                      title="Eliminar agente"
                      aria-label={`Eliminar a ${a.nombre}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface/15 text-surface/70 transition hover:border-naranja hover:bg-naranja/15 hover:text-surface disabled:opacity-50"
                    >
                      <span aria-hidden>{pendingDeleteId === a.id ? '…' : '🗑️'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Inputs robustos: border-b-4, texto blanco, foco naranja
// =============================================================================

type FieldProps = {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  placeholder?: string;
  hint?: string;
};

function SubtleField({
  label,
  name,
  type = 'text',
  required,
  minLength,
  autoFocus,
  placeholder,
  hint,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="border-0 border-b-4 border-surface/40 bg-transparent px-0 pb-2.5 pt-2 text-xl font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55"
      />
      {hint ? <span className="text-[0.7rem] text-surface/45">{hint}</span> : null}
    </label>
  );
}
