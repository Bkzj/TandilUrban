'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { href: string; label: string; visible?: boolean };

type Props = {
  /** El servidor decide si el usuario puede ver "Mi equipo" (rol INMOBILIARIA + perfil 1-1). */
  showEquipo: boolean;
};

export default function PanelTabs({ showEquipo }: Props) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: '/panel', label: 'Resumen' },
    { href: '/panel/propiedades', label: 'Propiedades' },
    { href: '/panel/propiedades/nueva', label: 'Nueva propiedad' },
    { href: '/panel/equipo', label: 'Mi equipo', visible: showEquipo },
  ];

  return (
    <nav
      aria-label="Navegación del panel"
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-surface/10 bg-surface/5 p-1.5 backdrop-blur"
    >
      {tabs
        .filter((tab) => tab.visible !== false)
        .map((tab) => {
          const isActive =
            tab.href === '/panel'
              ? pathname === '/panel'
              :             tab.href === '/panel/propiedades'
                ? pathname === '/panel/propiedades' ||
                  !!pathname?.startsWith('/panel/propiedades/editar/')
                : (pathname?.startsWith(tab.href) ?? false);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? 'bg-naranja text-surface shadow-sm shadow-naranja/30'
                  : 'text-surface/70 hover:bg-surface/10 hover:text-surface'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
    </nav>
  );
}
