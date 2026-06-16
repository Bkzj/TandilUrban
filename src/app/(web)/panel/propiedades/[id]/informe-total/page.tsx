import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BarChart3,
  Bath,
  BedDouble,
  Building2,
  Camera,
  Car,
  Eye,
  Flame,
  Hash,
  Heart,
  Layers,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Ruler,
  Shield,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { PropiedadInformePrintButton } from '@/components/panel/PropiedadInformePrintButton';
import { getCurrentUser, roleCanAccessPanel } from '@/lib/auth';
import {
  formatInformeContacto,
  getPropiedadInformeTotalData,
  labelEstadoContacto,
  labelEstadoPropiedad,
} from '@/lib/panel-propiedad-informe-total';
import type { CurrentUser } from '@/types/auth';

export const metadata = {
  title: 'Informe integral de propiedad | Propea Group',
};

export const dynamic = 'force-dynamic';

const VERDE = '#0A2A1A';
const VERDE_MID = '#0d3d24';
const DORADO = '#B4853F';
const DORADO_LIGHT = '#d4a574';

function formatPrecio(precio: number, moneda: string): string {
  return `${moneda} ${precio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function shortRef(id: string): string {
  return id.slice(-8).toUpperCase();
}

function interestLevel(score: number): { label: string; pct: number; color: string } {
  const pct = Math.min(100, Math.round((score / 250) * 100));
  if (score >= 150) return { label: 'Alto', pct: Math.max(pct, 55), color: '#059669' };
  if (score >= 60) return { label: 'Medio', pct, color: DORADO };
  return { label: 'Bajo', pct: Math.max(pct, 8), color: '#94a3b8' };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadInformeTotalPage({ params }: PageProps) {
  const { id } = await params;
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/panel/propiedades/${id}/informe-total`);
  if (!roleCanAccessPanel(user.rol)) redirect('/?error=unauthorized');

  const data = await getPropiedadInformeTotalData(id, user);
  if (!data) notFound();

  const { propiedad, consultas, visitasPresenciales } = data;
  const hoy = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());
  const ubicacion = [propiedad.direccion, propiedad.barrio].filter(Boolean).join(' · ');
  const interest = interestLevel(data.engagement.indiceInteres);
  const ref = shortRef(propiedad.id);

  const funnelMax = Math.max(propiedad.visitas, propiedad.consultas, data.visitasFisicasTotal, 1);
  const funnelSteps = [
    { label: 'Vistas web', value: propiedad.visitas, color: VERDE, icon: Eye },
    { label: 'Consultas', value: propiedad.consultas, color: DORADO, icon: MessageSquare },
    { label: 'Visitas presenciales', value: data.visitasFisicasTotal, color: '#059669', icon: Users },
  ];

  const coverStats = [
    { icon: Eye, label: 'Vistas web', value: String(propiedad.visitas) },
    { icon: MessageSquare, label: 'Consultas', value: String(propiedad.consultas) },
    { icon: TrendingUp, label: 'Conversión', value: `${data.convRatePct.toFixed(1)}%` },
    { icon: Users, label: 'Visitas físicas', value: String(data.visitasFisicasTotal) },
    { icon: Heart, label: 'Favoritos', value: String(data.favoritosCount) },
    { icon: Ruler, label: 'Valor / m²', value: data.valorM2 },
  ];

  return (
    <div className="min-h-screen print:m-0 print:bg-white print:p-0">
      <div className="print:hidden border-b border-white/10 bg-[#0A2A1A]/90 px-6 py-4 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link
            href="/panel/propiedades"
            prefetch={false}
            className="text-sm font-semibold text-[#d4a574] transition hover:text-white"
          >
            ← Volver a propiedades
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/panel/propiedades/${propiedad.id}/informe`}
              className="text-xs font-semibold uppercase tracking-wider text-white/55 hover:text-white"
            >
              Informe de valoración
            </Link>
            <Link
              href={`/panel/propiedades/editar/${propiedad.id}`}
              className="text-xs font-semibold uppercase tracking-wider text-white/55 hover:text-white"
            >
              Editar ficha
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] overflow-hidden bg-white text-gray-900 shadow-2xl print:max-w-none print:shadow-none">
        {/* ══════════════════════════════════════════
            PORTADA
        ══════════════════════════════════════════ */}
        <section className="pdf-page-break-after relative flex min-h-[280mm] flex-col bg-white print:min-h-[297mm] print:break-after-page">
          {/* Acento superior */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${VERDE}, ${DORADO})` }} />

          {/* Cover header */}
          <header className="relative flex items-start justify-between gap-4 px-8 pt-10 md:px-12 md:pt-12 print:px-10 print:pt-8">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-base font-bold uppercase tracking-widest text-white shadow-md"
                style={{ background: VERDE }}
              >
                PG
              </span>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em]" style={{ color: DORADO }}>
                  Propea Group · CRM Analytics
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
                  Informe integral
                </h1>
                <p className="mt-1 text-sm text-gray-500">{propiedad.inmobiliariaNombre}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
                style={{ borderColor: `${VERDE}25`, background: `${VERDE}08`, color: VERDE }}
              >
                <Shield className="h-3 w-3" aria-hidden />
                Confidencial
              </span>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-[0.6rem] font-bold uppercase tracking-wider text-gray-400">
                  <Hash className="h-3 w-3" aria-hidden />
                  Ref. {ref}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{hoy}</p>
              </div>
            </div>
          </header>

          {/* Cover hero image */}
          <div className="relative mx-8 mt-8 overflow-hidden rounded-2xl border border-gray-200 shadow-lg md:mx-12 print:mx-10 print:mt-6">
            <div className="relative aspect-[16/7] min-h-[180px] w-full bg-[#061a10]">
              {propiedad.imagenPrincipal ? (
                <Image
                  src={propiedad.imagenPrincipal}
                  alt={propiedad.titulo}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 210mm) 100vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/25">
                  Sin imagen principal
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#061a10] via-[#061a10]/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#061a10]/80 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge light>{propiedad.operacion}</Badge>
                  <Badge light>{propiedad.tipo}</Badge>
                  <Badge light>{labelEstadoPropiedad(propiedad.estado)}</Badge>
                  {propiedad.esExclusiva ? (
                    <Badge gold light>
                      Exclusiva
                    </Badge>
                  ) : null}
                </div>
                <h2 className="max-w-2xl text-2xl font-bold leading-tight text-white md:text-3xl">
                  {propiedad.titulo}
                </h2>
                {ubicacion ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    {ubicacion}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Price + specs row */}
          <div className="relative mx-8 mt-6 grid gap-4 md:mx-12 md:grid-cols-5 print:mx-10">
            <div
              className="rounded-2xl border bg-white p-5 md:col-span-2 print:break-inside-avoid"
              style={{ borderColor: `${DORADO}40`, borderLeftWidth: '4px', borderLeftColor: DORADO }}
            >
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em]" style={{ color: DORADO }}>
                Precio publicado
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 md:text-4xl">
                {formatPrecio(propiedad.precio, propiedad.moneda)}
              </p>
              {propiedad.expensas != null && propiedad.expensas > 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  + Expensas {formatPrecio(propiedad.expensas, propiedad.moneda)}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-gray-400">
                Publicada el {fmtDate(propiedad.createdAt)} · {data.diasEnMercado} días en mercado
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:col-span-3 sm:grid-cols-6">
              <SpecPill icon={Ruler} label="Total" value={`${propiedad.m2Total} m²`} />
              <SpecPill icon={Layers} label="Cubiertos" value={`${propiedad.m2Cubiertos} m²`} />
              <SpecPill icon={Building2} label="Amb." value={String(propiedad.ambientes)} />
              <SpecPill icon={BedDouble} label="Dorm." value={String(propiedad.dormitorios)} />
              <SpecPill icon={Bath} label="Baños" value={String(propiedad.banos)} />
              <SpecPill icon={Car} label="Coch." value={String(propiedad.cocheras)} />
            </div>
          </div>

          {/* Cover metrics grid */}
          <div className="relative mx-8 mt-6 md:mx-12 print:mx-10">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: DORADO }} aria-hidden />
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]" style={{ color: VERDE }}>
                Métricas de rendimiento
              </p>
              <div className="ml-2 h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {coverStats.map((stat) => (
                <CoverStat key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
              ))}
            </div>
          </div>

          {/* Pipeline de consultas */}
          <div className="relative mx-8 mt-5 grid gap-3 md:mx-12 md:grid-cols-2 print:mx-10">
            <CoverPipelineCard
              label="Consultas nuevas"
              value={data.consultasNuevas}
              sub={`de ${consultas.length} totales`}
              accent="#3b82f6"
            />
            <CoverPipelineCard
              label="Consultas respondidas"
              value={data.consultasRespondidas}
              sub="contactos atendidos"
              accent="#059669"
            />
          </div>

          {/* Cover footer — metadatos */}
          <footer className="relative mt-auto px-8 pb-10 pt-8 md:px-12 print:px-10 print:pb-8">
            <div className="flex flex-wrap items-center justify-end gap-4 border-t border-gray-200 pt-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" aria-hidden />
                {propiedad.imagenesCount} fotos
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {propiedad.latitud.toFixed(4)}, {propiedad.longitud.toFixed(4)}
              </span>
            </div>
          </footer>
        </section>

        {/* ══════════════════════════════════════════
            CUERPO — Análisis detallado
        ══════════════════════════════════════════ */}
        <div className="px-6 py-8 md:px-12 md:py-10 print:px-8 print:py-6">
          {/* Embudo + interés */}
          <div className="mt-2 grid gap-5 lg:grid-cols-5 print:mt-6 print:break-inside-avoid">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 lg:col-span-3">
              <SectionHeading icon={TrendingUp} title="Embudo de conversión" />
              <div className="mt-5 space-y-5">
                {funnelSteps.map((step, idx) => {
                  const pct = Math.round((step.value / funnelMax) * 100);
                  const StepIcon = step.icon;
                  return (
                    <div key={step.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                            style={{ background: step.color }}
                          >
                            <StepIcon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="text-sm font-medium text-gray-700">{step.label}</span>
                          {idx < funnelSteps.length - 1 ? (
                            <span className="text-xs text-gray-300">→</span>
                          ) : null}
                        </div>
                        <span className="text-lg font-bold tabular-nums text-gray-900">{step.value}</span>
                      </div>
                      <div className="relative h-3 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${Math.max(pct, step.value > 0 ? 4 : 0)}%`,
                            background: `linear-gradient(90deg, ${step.color}, ${step.color}cc)`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-right text-[0.65rem] tabular-nums text-gray-400">
                        {pct}% del máximo
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="flex flex-col justify-between rounded-2xl border p-5 lg:col-span-2 print:break-inside-avoid"
              style={{ borderColor: `${DORADO}40`, background: `${DORADO}08` }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5" style={{ color: DORADO }} aria-hidden />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Nivel de interés
                  </p>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <p className="text-5xl font-bold tabular-nums text-gray-900">{interest.label}</p>
                  <p className="mb-1.5 text-sm text-gray-500">{data.engagement.indiceInteres} pts</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="relative h-4 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${interest.pct}%`,
                      background: `linear-gradient(90deg, ${interest.color}, ${interest.color}99)`,
                    }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-[0.65rem] text-gray-400">
                  <span>Bajo</span>
                  <span>Medio</span>
                  <span>Alto</span>
                </div>
                <p className="mt-3 text-[0.65rem] leading-relaxed text-gray-400">
                  Vistas + consultas×2 + visitas físicas×3
                </p>
              </div>
            </div>
          </div>

          {propiedad.caracteristicas.length > 0 ? (
            <section className="mt-8 print:mt-6 print:break-inside-avoid">
              <SectionHeading icon={Building2} title="Características" />
              <div className="mt-3 flex flex-wrap gap-2">
                {propiedad.caracteristicas.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Consultas */}
          <section className="mt-10 print:mt-8 print:break-inside-avoid">
            <SectionHeading
              icon={MessageSquare}
              title={`Consultas recibidas (${consultas.length})`}
              accent
            />
            {consultas.length === 0 ? (
              <EmptyState text="Todavía no hay consultas registradas para esta propiedad." />
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead>
                      <tr style={{ background: VERDE }} className="text-white">
                        <Th>Interesado</Th>
                        <Th>Contacto</Th>
                        <Th>Fecha</Th>
                        <Th>Estado</Th>
                        <Th>Visitas</Th>
                        <Th>Mensaje</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultas.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                          <Td>
                            <span className="font-semibold text-gray-900">{c.nombre}</span>
                          </Td>
                          <Td>
                            <span className="text-gray-700">
                              {formatInformeContacto(c.telefono, c.email)}
                            </span>
                            {!c.telefono?.trim() && !c.email.endsWith('@panel.propea') ? (
                              <span className="mt-0.5 block text-xs text-gray-400">{c.email}</span>
                            ) : null}
                          </Td>
                          <Td muted>{fmtDate(c.createdAt)}</Td>
                          <Td>
                            <EstadoBadge estado={c.estado} />
                          </Td>
                          <Td>
                            <span
                              className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                                c.visitasFisicas > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {c.visitasFisicas}
                            </span>
                          </Td>
                          <Td muted>
                            <span className="block whitespace-pre-wrap">{c.mensaje}</span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Visitas presenciales */}
          <section className="mt-10 print:mt-8 print:break-inside-avoid">
            <SectionHeading
              icon={Users}
              title={`Visitas presenciales (${visitasPresenciales.length})`}
              accent
            />
            {visitasPresenciales.length === 0 ? (
              <EmptyState text="No hay visitas presenciales registradas." />
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr style={{ background: VERDE }} className="text-white">
                        <Th>Visitante</Th>
                        <Th>Contacto</Th>
                        <Th>Fecha y hora</Th>
                        <Th>Registrado por</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitasPresenciales.map((v, i) => (
                        <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                          <Td>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                                aria-hidden
                              >
                                <User className="h-3.5 w-3.5" />
                              </span>
                              <span className="font-semibold text-gray-900">{v.visitanteNombre}</span>
                            </div>
                          </Td>
                          <Td muted>{formatInformeContacto(v.visitanteTelefono, v.visitanteEmail)}</Td>
                          <Td muted>{fmtDateTime(v.fecha)}</Td>
                          <Td>
                            <span className="rounded-full bg-[#B4853F]/10 px-2.5 py-0.5 text-xs font-medium text-[#9a7033]">
                              {v.registradoPorNombre}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Footer — agente + cierre */}
          <footer
            className="mt-10 overflow-hidden rounded-2xl print:mt-8 print:break-inside-avoid"
            style={{ background: `linear-gradient(135deg, ${VERDE} 0%, ${VERDE_MID} 100%)` }}
          >
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
              <div>
                <p
                  className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
                  style={{ color: DORADO_LIGHT }}
                >
                  Agente responsable
                </p>
                <p className="mt-2 text-xl font-bold text-white">{propiedad.agenteNombre}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm text-white/70">
                  <span className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: DORADO_LIGHT }} aria-hidden />
                    {propiedad.agenteTelefono}
                  </span>
                  {propiedad.agenteEmail ? (
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: DORADO_LIGHT }} aria-hidden />
                      {propiedad.agenteEmail}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-sm">
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/45">
                  Confidencial · Ref. {ref}
                </p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/60">
                  Documento de uso interno de {propiedad.inmobiliariaNombre}. Propea Group · {hoy}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </article>

      <PropiedadInformePrintButton
        propiedadId={propiedad.id}
        variant="total"
        filename={`informe-integral-${ref}.pdf`}
      />
    </div>
  );
}

/* ── Cover sub-components ── */

function CoverStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3">
      <div className="absolute left-0 top-0 h-full w-0.5" style={{ background: VERDE }} />
      <Icon className="mb-1.5 h-3.5 w-3.5" style={{ color: DORADO }} aria-hidden />
      <p className="text-[0.55rem] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

function SpecPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50/60 px-2 py-3 text-center">
      <Icon className="mb-1 h-3.5 w-3.5" style={{ color: VERDE }} aria-hidden />
      <p className="text-[0.5rem] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

function CoverPipelineCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border bg-white px-4 py-3"
      style={{ borderColor: `${accent}30`, borderLeftWidth: '3px', borderLeftColor: accent }}
    >
      <p className="text-[0.55rem] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-[0.65rem] text-gray-400">{sub}</p>
    </div>
  );
}

/* ── Body sub-components ── */

function SectionHeading({
  icon: Icon,
  title,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          accent ? 'bg-[#B4853F]/10' : 'bg-[#0A2A1A]/10'
        }`}
      >
        <Icon className={`h-4 w-4 ${accent ? 'text-[#B4853F]' : 'text-[#0A2A1A]'}`} aria-hidden />
      </span>
      <h3
        className={`text-sm font-bold uppercase tracking-wider ${
          accent ? 'text-[#B4853F]' : 'text-[#0A2A1A]'
        }`}
      >
        {title}
      </h3>
      <div className="ml-2 h-px flex-1 bg-gray-200" />
    </div>
  );
}

function Badge({
  children,
  light,
  gold,
}: {
  children: ReactNode;
  light?: boolean;
  gold?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
        gold
          ? 'bg-[#B4853F] text-white'
          : light
            ? 'border border-white/25 bg-white/15 text-white backdrop-blur-sm'
            : 'bg-gray-100 text-gray-700'
      }`}
    >
      {children}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    NUEVO: 'bg-blue-100 text-blue-800',
    LEIDO: 'bg-amber-100 text-amber-800',
    RESPONDIDO: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[estado] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {labelEstadoContacto(estado)}
    </span>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl">
      {children}
    </th>
  );
}

function Td({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <td className={`px-4 py-3.5 align-top ${muted ? 'text-gray-500' : 'text-gray-800'}`}>
      {children}
    </td>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
