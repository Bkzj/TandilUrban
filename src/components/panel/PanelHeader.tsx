'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Header global del backoffice.
 * - Logo a la izquierda → /panel.
 * - CTA derecha contextual:
 *    · /panel exacto       → "Ir al sitio público"  → /
 *    · /panel/<sub-ruta>   → "Volver al panel"      → /panel
 */
export default function PanelHeader() {
  const pathname = usePathname() ?? '/panel';
  const isPanelRoot = pathname === '/panel' || pathname === '/panel/';

  const ctaHref = isPanelRoot ? '/' : '/panel';
  const ctaLabel = isPanelRoot ? 'Ir al sitio público' : 'Volver al panel';

  return (
    <header className="sticky top-0 z-40 border-b border-surface/10 bg-text-primary/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <Link
          href="/panel"
          className="group flex items-center gap-3 text-surface"
          aria-label="Ir al inicio del panel"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-naranja text-sm font-bold uppercase tracking-widest text-surface shadow-md shadow-naranja/30 ring-1 ring-naranja/40"
          >
            TU
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-bold uppercase tracking-[0.2em] text-surface">
              TandilUrban
            </span>
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.32em] text-naranja-light">
              Backoffice
            </span>
          </span>
        </Link>

        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-2 rounded-xl border border-surface/15 bg-surface/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface/80 transition hover:border-naranja/60 hover:bg-naranja/15 hover:text-surface"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
