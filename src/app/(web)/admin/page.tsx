import Link from 'next/link';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { requireGlobalAdmin } from '@/lib/panel-authorization';

export const metadata = { title: 'Administración global | Propea Group' };

export default async function AdminOverviewPage() {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  const [users, inmobiliarias, agents, publications, activeUsers, unverifiedUsers, recentTenants] = await Promise.all([
    prisma.user.count(),
    prisma.inmobiliaria.count(),
    prisma.user.count({ where: { rol: 'AGENTE' } }),
    prisma.propiedad.count(),
    prisma.user.count({ where: { activo: true } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.inmobiliaria.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nombreAgencia: true, createdAt: true, _count: { select: { agentes: true, propiedades: true } } } }),
  ]);
  const cards = [
    { label: 'Usuarios', value: users, href: '/admin/usuarios' },
    { label: 'Inmobiliarias', value: inmobiliarias, href: '/admin/inmobiliarias' },
    { label: 'Agentes', value: agents, href: '/admin/usuarios?rol=AGENTE' },
    { label: 'Publicaciones', value: publications, href: '/admin/publicaciones' },
  ];
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Panel general</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Administración de Propea Group</h1><p className="mt-3 max-w-2xl text-white/70">Vista global de cuentas, inmobiliarias, agentes y publicaciones.</p></header>
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen global">
        {cards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-lg transition hover:border-naranja/40 hover:bg-white/10"><span className="text-sm font-semibold text-white/65">{card.label}</span><strong className="mt-3 block text-4xl text-white">{card.value}</strong><span className="mt-4 block text-sm font-semibold text-emerald-300">Ver detalle →</span></Link>)}
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20"><h2 className="text-xl font-semibold">Estado de cuentas</h2><dl className="mt-5 space-y-4"><div className="flex justify-between"><dt className="text-white/65">Activas</dt><dd className="font-semibold">{activeUsers}</dd></div><div className="flex justify-between"><dt className="text-white/65">Sin verificar</dt><dd className="font-semibold">{unverifiedUsers}</dd></div></dl></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Últimas inmobiliarias</h2><Link href="/admin/inmobiliarias" className="text-sm font-semibold text-naranja-light">Administrar →</Link></div><ul className="mt-4 divide-y divide-white/10">{recentTenants.map((tenant) => <li key={tenant.id} className="flex flex-wrap justify-between gap-2 py-4"><span><strong className="block">{tenant.nombreAgencia}</strong><span className="text-sm text-white/55">{tenant.createdAt.toLocaleDateString('es-AR')}</span></span><span className="text-sm text-white/65">{tenant._count.agentes} agentes · {tenant._count.propiedades} publicaciones</span></li>)}</ul></div>
      </section>
    </main>
  );
}
