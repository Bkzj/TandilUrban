import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RolUsuario, type Prisma } from '@/generated/prisma';

import { AdminAccountStatusButton } from '@/components/admin/AdminAccountStatusButton';
import { prisma } from '@/lib/prisma';
import { requireGlobalAdmin } from '@/lib/panel-authorization';

export const metadata = { title: 'Usuarios | Administración' };
const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const role = typeof params.rol === 'string' && Object.values(RolUsuario).includes(params.rol as RolUsuario) ? params.rol as RolUsuario : undefined;
  const status = params.estado === 'activo' || params.estado === 'inactivo' ? params.estado : undefined;
  const tenant = typeof params.tenant === 'string' ? params.tenant : undefined;
  const page = typeof params.page === 'string' && /^\d+$/u.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(role ? { rol: role } : {}),
    ...(status ? { activo: status === 'activo' } : {}),
    ...(tenant ? { OR: [{ agenciaId: tenant }, { inmobiliariaPerfil: { id: tenant } }] } : {}),
  };
  const [users, total, tenants] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, nombre: true, email: true, rol: true, activo: true, emailVerifiedAt: true, createdAt: true, agencia: { select: { id: true, nombreAgencia: true } }, inmobiliariaPerfil: { select: { id: true, nombreAgencia: true } } } }),
    prisma.user.count({ where }),
    prisma.inmobiliaria.findMany({ orderBy: { nombreAgencia: 'asc' }, select: { id: true, nombreAgencia: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Administración</p><h1 className="mt-2 text-4xl font-semibold">Usuarios</h1><p className="mt-2 text-white/65">{total} cuentas coinciden con los filtros.</p></header><form className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4" role="search"><label className="sm:col-span-2"><span className="sr-only">Buscar por nombre o email</span><input name="q" defaultValue={q} placeholder="Nombre o email" className="min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/35 focus:border-naranja focus:outline-none" /></label><label><span className="sr-only">Filtrar por rol</span><select name="rol" defaultValue={role ?? ''} className="min-h-11 w-full rounded-xl border border-white/15 bg-text-primary px-3"><option value="">Todos los roles</option>{Object.values(RolUsuario).map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="sr-only">Filtrar por estado</span><select name="estado" defaultValue={status ?? ''} className="min-h-11 w-full rounded-xl border border-white/15 bg-text-primary px-3"><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label><label className="sm:col-span-3"><span className="sr-only">Filtrar por inmobiliaria</span><select name="tenant" defaultValue={tenant ?? ''} className="min-h-11 w-full rounded-xl border border-white/15 bg-text-primary px-3"><option value="">Todas las inmobiliarias</option>{tenants.map((item) => <option key={item.id} value={item.id}>{item.nombreAgencia}</option>)}</select></label><button className="min-h-11 rounded-xl bg-naranja px-4 font-semibold">Aplicar filtros</button></form><section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/55"><tr><th className="px-5 py-4">Cuenta</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Inmobiliaria</th><th className="px-5 py-4">Creada</th><th className="px-5 py-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-white/10">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><strong className="block">{user.nombre}</strong><span className="text-white/55">{user.email}</span></td><td className="px-5 py-4">{user.rol}</td><td className="px-5 py-4">{user.activo ? user.emailVerifiedAt ? 'Activa · verificada' : 'Activa · sin verificar' : 'Inactiva'}</td><td className="px-5 py-4">{user.inmobiliariaPerfil?.nombreAgencia ?? user.agencia?.nombreAgencia ?? 'Sin asociación'}</td><td className="px-5 py-4 text-white/60">{user.createdAt.toLocaleDateString('es-AR')}</td><td className="px-5 py-4 text-right">{user.rol === RolUsuario.ADMIN ? <span className="text-xs text-white/50">Gestión operativa</span> : <AdminAccountStatusButton userId={user.id} active={user.activo} canActivate={Boolean(user.emailVerifiedAt)} />}</td></tr>)}</tbody></table></div></section><nav className="mt-6 flex items-center justify-between" aria-label="Paginación"><span className="text-sm text-white/60">Página {page} de {pages}</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-xl border border-white/15 px-4 py-2" href={{ query: { ...params, page: String(page - 1) } }}>Anterior</Link> : null}{page < pages ? <Link className="rounded-xl border border-white/15 px-4 py-2" href={{ query: { ...params, page: String(page + 1) } }}>Siguiente</Link> : null}</div></nav></main>;
}
