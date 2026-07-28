'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Trash2, X } from 'lucide-react';

import {
  ajustarVisitaFisica,
  eliminarVisitaFisicaEvento,
  registrarVisitaFisicaManual,
} from '@/actions/contacto';
import type { PanelConsultaPreview, PanelPropiedadTableRow, PanelVisitanteFisicoPreview } from '@/types/panel';
import { formatMoneyAmount } from '@/lib/money-format';

import { DeletePropertyButton } from './DeletePropertyButton';

type Props = {
  propiedad: PanelPropiedadTableRow;
  onClose: () => void;
  onPropiedadUpdate?: (updated: PanelPropiedadTableRow) => void;
};

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect fill="#141414" width="400" height="240"/><text x="200" y="120" fill="#666" text-anchor="middle" font-family="sans-serif" font-size="14">Sin imagen</text></svg>`
  );

function msPerDay(): number {
  return 1000 * 60 * 60 * 24;
}

function diasEnMercado(createdIso: string): number {
  const start = new Date(createdIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / msPerDay()));
}

function convRatePct(visitas: number, consultas: number): number {
  if (visitas <= 0) return 0;
  return (consultas / visitas) * 100;
}

function fmtVisitaDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtConsultaDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function contactoDisplay(telefono: string | null, email: string): string {
  const tel = telefono?.trim();
  if (tel) return tel;
  if (email.endsWith('@panel.propea')) return 'Sin teléfono';
  return email;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/70">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-white md:text-2xl">{value}</p>
    </div>
  );
}

export function PropertyQuickView({ propiedad, onClose, onPropiedadUpdate }: Props) {
  const [visitasFisicas, setVisitasFisicas] = useState(propiedad.visitasFisicas);
  const [visitantes, setVisitantes] = useState(propiedad.visitantesPresenciales);
  const [consultasPropiedad, setConsultasPropiedad] = useState(propiedad.consultasPropiedad);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNombre, setManualNombre] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualTelefono, setManualTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const thumb = propiedad.imagenes[0]?.url?.trim() || PLACEHOLDER;
  const visitas = propiedad.visitas ?? 0;
  const consultas = propiedad.consultas ?? 0;
  const dias = diasEnMercado(propiedad.createdAt);
  const conv = convRatePct(visitas, consultas);
  const valorM2 = propiedad.valorM2
    ? `${propiedad.moneda} ${formatMoneyAmount(propiedad.valorM2)}`
    : '—';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function publishUpdate(
    nextVisitasFisicas: number,
    nextVisitantes: PanelVisitanteFisicoPreview[],
    nextConsultas: PanelConsultaPreview[],
  ) {
    setVisitasFisicas(nextVisitasFisicas);
    setVisitantes(nextVisitantes);
    setConsultasPropiedad(nextConsultas);
    onPropiedadUpdate?.({
      ...propiedad,
      visitasFisicas: nextVisitasFisicas,
      visitantesPresenciales: nextVisitantes,
      consultasPropiedad: nextConsultas,
    });
  }

  function upsertConsulta(
    consultas: PanelConsultaPreview[],
    contacto: PanelConsultaPreview,
  ): PanelConsultaPreview[] {
    const idx = consultas.findIndex((c) => c.id === contacto.id);
    if (idx === -1) {
      return [contacto, ...consultas];
    }
    return consultas.map((c) => (c.id === contacto.id ? contacto : c));
  }

  function appendVisita(
    contacto: PanelConsultaPreview,
    evento: { id: string; createdAt: string },
  ): PanelVisitanteFisicoPreview {
    return {
      id: evento.id,
      contactoId: contacto.id,
      nombre: contacto.nombre,
      email: contacto.email,
      telefono: contacto.telefono,
      fechaVisita: evento.createdAt,
    };
  }

  function handleRegistrarDesdeConsulta(consulta: PanelConsultaPreview) {
    setError(null);
    setRegisteringId(consulta.id);

    startTransition(async () => {
      const result = await ajustarVisitaFisica(consulta.id, 1, crypto.randomUUID());
      setRegisteringId(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (!result.eventoRegistrado) {
        setError('La visita se registró pero no pudimos actualizar el listado.');
        return;
      }

      const contactoActualizado = {
        ...consulta,
        visitasFisicas: result.visitasFisicas,
      };
      const visitante = appendVisita(contactoActualizado, result.eventoRegistrado);
      const nextVisitantes = [visitante, ...visitantes.filter((v) => v.id !== visitante.id)];
      const nextConsultas = upsertConsulta(consultasPropiedad, contactoActualizado);

      publishUpdate(result.visitasFisicasPropiedad, nextVisitantes, nextConsultas);
      setPickerOpen(false);
    });
  }

  function handleRegistrarManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nombre = manualNombre.trim();
    const email = manualEmail.trim();
    const telefono = manualTelefono.trim();

    if (!nombre) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!email && !telefono) {
      setError('Ingresá un teléfono o un email.');
      return;
    }

    startTransition(async () => {
      const result = await registrarVisitaFisicaManual({
        propiedadId: propiedad.id,
        nombre,
        email: email || undefined,
        telefono: telefono || undefined,
        idempotencyKey: crypto.randomUUID(),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const contacto: PanelConsultaPreview = {
        id: result.contacto.id,
        nombre: result.contacto.nombre,
        email: result.contacto.email,
        telefono: result.contacto.telefono,
        visitasFisicas: result.contacto.visitasFisicas,
        createdAt: result.contacto.createdAt,
      };
      const visitante = appendVisita(contacto, result.evento);
      const nextVisitantes = [visitante, ...visitantes.filter((v) => v.id !== visitante.id)];
      const nextConsultas = upsertConsulta(consultasPropiedad, contacto);

      publishUpdate(result.visitasFisicasPropiedad, nextVisitantes, nextConsultas);
      setManualNombre('');
      setManualEmail('');
      setManualTelefono('');
      setManualOpen(false);
    });
  }

  function handleEliminarVisita(visitante: PanelVisitanteFisicoPreview) {
    if (!window.confirm(`¿Eliminar la visita de ${visitante.nombre}?`)) return;

    setError(null);
    setDeletingId(visitante.id);

    startTransition(async () => {
      const result = await eliminarVisitaFisicaEvento(visitante.id, crypto.randomUUID());
      setDeletingId(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const contactoId = result.contactoId ?? visitante.contactoId;
      const nextVisitantes = visitantes.filter((v) => v.id !== visitante.id);
      const nextConsultas = consultasPropiedad.map((c) =>
        c.id === contactoId ? { ...c, visitasFisicas: result.visitasFisicas } : c,
      );

      publishUpdate(result.visitasFisicasPropiedad, nextVisitantes, nextConsultas);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      data-lenis-prevent="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="relative flex min-h-0 max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A2A1A] text-white shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <div className="relative -mx-6 -mt-6 mb-6 aspect-[16/10] w-[calc(100%+3rem)] overflow-hidden border-b border-white/10">
            {thumb && !thumb.startsWith('data:') ? (
              <Image src={thumb} alt="" fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- placeholder SVG data URI
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Vista rápida</p>
          <h2 id="quick-view-title" className="mt-2 text-2xl font-semibold leading-tight text-white">
            {propiedad.titulo}
          </h2>
          <p className="mt-2 text-sm uppercase tracking-wide text-white/70">
            {propiedad.operacion} · {propiedad.tipo}
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-white">
            {propiedad.moneda} {formatMoneyAmount(propiedad.precio)}
          </p>

          <div className="mb-6 mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard label="Vistas web" value={visitas} />
            <MetricCard label="Consultas" value={consultas} />
            <MetricCard label="Conv. rate" value={`${conv.toFixed(1)}%`} />
            <MetricCard label="En favoritos" value={propiedad.favoritosCount} />
            <MetricCard label="Días activa" value={dias} />
            <MetricCard label="Valor m²" value={valorM2} />
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                Visitas presenciales ({visitasFisicas})
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualOpen(false);
                    setPickerOpen((open) => !open);
                  }}
                  disabled={consultasPropiedad.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#B4853F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#9a7033] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Desde consulta
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    setManualOpen((open) => !open);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  + Carga manual
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${manualOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            {consultasPropiedad.length === 0 && !manualOpen ? (
              <p className="mb-3 text-xs text-white/50">
                No hay consultas web. Podés registrar una visita con carga manual.
              </p>
            ) : null}

            {pickerOpen && consultasPropiedad.length > 0 ? (
              <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-white/60">
                  Elegí una consulta
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {consultasPropiedad.map((consulta) => {
                    const contacto = contactoDisplay(consulta.telefono, consulta.email);
                    const isRegistering = isPending && registeringId === consulta.id;

                    return (
                      <li
                        key={consulta.id}
                        className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{consulta.nombre}</p>
                          <p className="text-xs text-white/55">
                            Consulta · {fmtConsultaDate(consulta.createdAt)}
                            {consulta.visitasFisicas > 0
                              ? ` · ${consulta.visitasFisicas} visita${consulta.visitasFisicas === 1 ? '' : 's'}`
                              : ''}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-white/45">{contacto}</p>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRegistrarDesdeConsulta(consulta)}
                          className="shrink-0 rounded-lg border border-[#B4853F]/50 bg-[#B4853F]/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#B4853F]/30 disabled:opacity-50"
                        >
                          {isRegistering ? 'Registrando…' : 'Registrar visita'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {manualOpen ? (
              <form
                onSubmit={handleRegistrarManual}
                className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-wider text-white/60">
                  Carga manual · teléfono o email obligatorio
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs text-white/60">Nombre</span>
                    <input
                      type="text"
                      value={manualNombre}
                      onChange={(e) => setManualNombre(e.target.value)}
                      required
                      minLength={2}
                      placeholder="Nombre del visitante"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#B4853F]/50 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/60">Email</span>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#B4853F]/50 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/60">Teléfono</span>
                    <input
                      type="tel"
                      value={manualTelefono}
                      onChange={(e) => setManualTelefono(e.target.value)}
                      placeholder="+54 9 ..."
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#B4853F]/50 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-[#B4853F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9a7033] disabled:opacity-50"
                  >
                    {isPending && !registeringId && !deletingId ? 'Guardando…' : 'Registrar visita'}
                  </button>
                </div>
              </form>
            ) : null}

            {error ? (
              <p className="mb-3 text-xs text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <ul>
              {visitantes.length === 0 ? (
                <li className="py-4 text-center text-xs text-white/45">
                  No hay visitas presenciales registradas.
                </li>
              ) : (
                visitantes.map((visitante) => {
                  const contacto = contactoDisplay(visitante.telefono, visitante.email);
                  const isDeleting = isPending && deletingId === visitante.id;

                  return (
                    <li
                      key={visitante.id}
                      className="group flex flex-col gap-2 border-b border-white/10 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{visitante.nombre}</p>
                        <p className="text-xs text-white/60">{fmtVisitaDate(visitante.fechaVisita)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-fit rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 backdrop-blur-sm">
                          {contacto}
                        </span>
                        <button
                          type="button"
                          title="Eliminar visita"
                          disabled={isPending}
                          onClick={() => handleEliminarVisita(visitante)}
                          className="rounded-md p-2 text-white/40 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Eliminar visita</span>
                        </button>
                        {isDeleting ? (
                          <span className="text-[0.65rem] text-white/45">Eliminando…</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <footer className="mt-auto flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/20 p-6">
          <Link
            href={`/panel/propiedades/${propiedad.id}/informe`}
            prefetch={false}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-[#B4853F] py-3.5 text-center text-sm font-bold text-white shadow-lg transition-all hover:bg-[#9a7033]"
          >
            Informe de valoración (PDF)
          </Link>
          <Link
            href={`/panel/propiedades/${propiedad.id}/informe-total`}
            prefetch={false}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-xl border border-[#B4853F]/50 bg-[#B4853F]/10 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-[#B4853F]/20"
          >
            Informe integral (métricas y leads)
          </Link>
          <Link
            href={`/panel/propiedades/editar/${propiedad.id}`}
            prefetch={false}
            className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-white/20"
          >
            Editar propiedad
          </Link>
          <DeletePropertyButton propiedadId={propiedad.id} variant="link" onSuccess={onClose} />
        </footer>
      </div>
    </div>
  );
}
