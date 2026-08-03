import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { accountInvitationStatus, INVITATION_STATUS_LABELS } from '@/server/admin/invitation-status';

export const metadata = { title: 'Inmobiliarias | Administración' };

export default async function AdminInmobiliariasPage() {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  const tenants = await prisma.inmobiliaria.findMany({
    orderBy: { createdAt: 'desc' }, take: 100,
    select: {
      id: true, nombreAgencia: true, cuit: true, direccion: true, createdAt: true,
      user: { select: { nombre: true, email: true, activo: true } },
      accountInvitations: { orderBy: { createdAt: 'desc' }, take: 1, select: { consumedAt: true, invalidatedAt: true, expiresAt: true, deliveryStatus: true } },
      _count: { select: { agentes: true, propiedades: true } },
    },
  });
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Administración</p><h1 className="mt-2 text-4xl font-semibold">Inmobiliarias</h1><p className="mt-2 text-white/65">Administradores, invitaciones y relaciones de cada inmobiliaria.</p></div><Link href="/admin/inmobiliarias/nueva" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-naranja px-5 py-3 font-semibold text-white shadow-lg shadow-naranja/25">+ Nueva inmobiliaria</Link></header><section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/55"><tr><th className="px-5 py-4">Inmobiliaria</th><th className="px-5 py-4">Administrador</th><th className="px-5 py-4">Invitación</th><th className="px-5 py-4">Relaciones</th><th className="px-5 py-4">Creada</th><th className="px-5 py-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-white/10">{tenants.map((tenant) => { const status = accountInvitationStatus(tenant.accountInvitations[0] ?? null); return <tr key={tenant.id}><td className="px-5 py-4"><strong className="block">{tenant.nombreAgencia}</strong><span className="text-white/55">{tenant.cuit} · {tenant.direccion}</span></td><td className="px-5 py-4"><span className="block">{tenant.user.nombre}</span><span className="text-white/55">{tenant.user.email}</span></td><td className="px-5 py-4"><span className="font-semibold">{INVITATION_STATUS_LABELS[status]}</span>{tenant.user.activo ? <span className="block text-xs text-emerald-200">Cuenta activa</span> : null}</td><td className="px-5 py-4">{tenant._count.agentes} agentes · {tenant._count.propiedades} publicaciones</td><td className="px-5 py-4 text-white/60">{tenant.createdAt.toLocaleDateString('es-AR')}</td><td className="px-5 py-4"><Link href={`/admin/inmobiliarias/${tenant.id}`} className="font-semibold text-naranja-light">Ver detalle →</Link></td></tr>; })}</tbody></table></div></section></main>;
}
