import Link from 'next/link';
import { redirect } from 'next/navigation';
import { type Prisma } from '@/generated/prisma';

import { prisma } from '@/lib/prisma';
import { requireGlobalAdmin } from '@/lib/panel-authorization';

export const metadata = { title: 'Publicaciones | Administración' };
const PAGE_SIZE = 30;

export default async function AdminPropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const page = typeof params.page === 'string' && /^\d+$/u.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const where: Prisma.PropiedadWhereInput = q ? { OR: [{ titulo: { contains: q, mode: 'insensitive' } }, { inmobiliaria: { nombreAgencia: { contains: q, mode: 'insensitive' } } }] } : {};
  const [properties, total] = await Promise.all([
    prisma.propiedad.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, titulo: true, estado: true, operacion: true, precio: true, moneda: true, createdAt: true, updatedAt: true, inmobiliaria: { select: { nombreAgencia: true } }, agente: { select: { nombre: true } } } }),
    prisma.propiedad.count({ where }),
  ]);
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Inventario global</p><h1 className="mt-2 text-4xl font-semibold">Publicaciones</h1><p className="mt-2 text-white/65">{total} propiedades en todas las inmobiliarias.</p></header><form className="mt-8 flex gap-3" role="search"><label className="flex-1"><span className="sr-only">Buscar publicación o inmobiliaria</span><input name="q" defaultValue={q} placeholder="Título o inmobiliaria" className="min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/35 focus:border-naranja focus:outline-none" /></label><button className="rounded-xl bg-naranja px-5 font-semibold">Buscar</button></form><section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/55"><tr><th className="px-5 py-4">Publicación</th><th className="px-5 py-4">Inmobiliaria</th><th className="px-5 py-4">Agente</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Operación</th><th className="px-5 py-4">Precio</th><th className="px-5 py-4">Actualizada</th><th className="px-5 py-4">Acción</th></tr></thead><tbody className="divide-y divide-white/10">{properties.map((property) => <tr key={property.id}><td className="px-5 py-4 font-semibold">{property.titulo}</td><td className="px-5 py-4">{property.inmobiliaria.nombreAgencia}</td><td className="px-5 py-4 text-white/65">{property.agente?.nombre ?? 'Sin asignar'}</td><td className="px-5 py-4">{property.estado}</td><td className="px-5 py-4">{property.operacion}</td><td className="px-5 py-4">{property.moneda} {property.precio.toString()}</td><td className="px-5 py-4 text-white/60">{property.updatedAt.toLocaleDateString('es-AR')}</td><td className="px-5 py-4"><Link href={`/panel/propiedades/editar/${property.id}`} className="font-semibold text-naranja-light hover:text-white">Administrar</Link></td></tr>)}</tbody></table></div></section></main>;
}
