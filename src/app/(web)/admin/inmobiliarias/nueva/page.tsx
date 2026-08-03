import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CreateInmobiliariaForm } from '@/components/admin/CreateInmobiliariaForm';
import { requireGlobalAdmin } from '@/lib/panel-authorization';

export const metadata = { title: 'Nueva inmobiliaria | Administración' };

export default async function NewInmobiliariaPage() {
  await requireGlobalAdmin().catch(() => redirect('/?error=unauthorized'));
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/admin/inmobiliarias" className="text-sm font-semibold text-naranja-light">← Volver a inmobiliarias</Link><header className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja-light">Administración</p><h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Nueva inmobiliaria</h1><p className="mt-3 max-w-2xl text-white/65">Creá la inmobiliaria y enviá una invitación segura a quien la administrará.</p></header><div className="mt-8"><CreateInmobiliariaForm /></div></main>;
}
