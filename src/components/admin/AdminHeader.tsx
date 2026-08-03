'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Resumen', exact: true },
  { href: '/admin/inmobiliarias', label: 'Inmobiliarias', exact: false },
  { href: '/admin/usuarios', label: 'Usuarios', exact: false },
  { href: '/admin/publicaciones', label: 'Publicaciones', exact: false },
] as const;

export function AdminHeader() {
  const pathname = usePathname() ?? '/admin';
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-text-primary/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Administración global de Propea Group">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-naranja font-bold text-white shadow-lg shadow-naranja/25" aria-hidden>PG</span>
          <span><span className="block font-serif text-lg font-bold tracking-wide text-white">Propea Group</span><span className="block text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-naranja-light">Administración global</span></span>
        </Link>
        <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-naranja/60 hover:text-white">Ir al sitio público</Link>
        <nav aria-label="Administración global" className="order-3 flex w-full gap-2 overflow-x-auto pb-1">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} className={`min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-naranja text-white shadow-md shadow-naranja/20' : 'border border-white/10 text-white/75 hover:bg-white/10 hover:text-white'}`}>{link.label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
