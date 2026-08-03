import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AdminInviteAgentForm } from '@/components/admin/AdminInviteAgentForm';
import { ResendInvitationButton } from '@/components/admin/ResendInvitationButton';
import { AdminAccountStatusButton } from '@/components/admin/AdminAccountStatusButton';
import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { accountInvitationStatus, INVITATION_STATUS_LABELS } from '@/server/admin/invitation-status';

export default async function AdminInmobiliariaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  const { id } = await params;
  const tenant = await prisma.inmobiliaria.findUnique({
    where: { id },
    select: {
      id: true, nombreAgencia: true, cuit: true, direccion: true, createdAt: true,
      user: { select: { id: true, nombre: true, email: true, activo: true, emailVerifiedAt: true } },
      accountInvitations: { orderBy: { createdAt: 'desc' }, take: 1, select: { deliveryStatus: true, consumedAt: true, invalidatedAt: true, expiresAt: true } },
      _count: { select: { agentes: true, propiedades: true } },
    },
  });
  if (!tenant) notFound();
  const invitation = tenant.accountInvitations[0] ?? null;
  const status = accountInvitationStatus(invitation);
  const mayResend = !tenant.user.activo && status !== 'ACCEPTED';
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/admin/inmobiliarias" className="text-sm font-semibold text-naranja-light">← Volver a inmobiliarias</Link><header className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Inmobiliaria</p><h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{tenant.nombreAgencia}</h1><p className="mt-2 text-white/65">Creada el {tenant.createdAt.toLocaleDateString('es-AR')}</p></header><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20"><h2 className="text-xl font-semibold">Datos de la inmobiliaria</h2><dl className="mt-5 space-y-4"><div><dt className="text-sm text-white/55">CUIT</dt><dd className="font-semibold">{tenant.cuit}</dd></div><div><dt className="text-sm text-white/55">Dirección</dt><dd className="font-semibold">{tenant.direccion}</dd></div><div><dt className="text-sm text-white/55">Relaciones</dt><dd>{tenant._count.agentes} agentes · {tenant._count.propiedades} publicaciones</dd></div></dl><div className="mt-6 flex flex-wrap gap-3"><Link href={`/admin/publicaciones?inmobiliariaId=${tenant.id}`} className="rounded-xl border border-white/20 px-4 py-2 font-semibold">Ver publicaciones</Link><Link href={`/admin/usuarios?tenant=${tenant.id}&rol=AGENTE`} className="rounded-xl border border-white/20 px-4 py-2 font-semibold">Ver agentes</Link></div></section><section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20"><h2 className="text-xl font-semibold">Administrador</h2><p className="mt-4 font-semibold">{tenant.user.nombre}</p><p className="text-sm text-white/60">{tenant.user.email}</p><dl className="mt-5 space-y-3"><div><dt className="text-sm text-white/55">Cuenta</dt><dd>{tenant.user.activo ? 'Activa' : 'Inactiva'}</dd></div><div><dt className="text-sm text-white/55">Invitación</dt><dd className="font-semibold">{INVITATION_STATUS_LABELS[status]}</dd></div>{invitation ? <div><dt className="text-sm text-white/55">Vence</dt><dd>{invitation.expiresAt.toLocaleString('es-AR')}</dd></div> : null}</dl><div className="mt-6 flex flex-wrap items-start gap-3">{mayResend ? <ResendInvitationButton inmobiliariaId={tenant.id} /> : null}{tenant.user.activo ? <AdminAccountStatusButton userId={tenant.user.id} active canActivate /> : null}</div></section></div><div className="mt-6"><AdminInviteAgentForm tenants={[{ id: tenant.id, nombreAgencia: tenant.nombreAgencia }]} /></div></main>;
}
