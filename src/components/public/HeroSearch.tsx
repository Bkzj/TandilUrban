'use client';

import { PublicSearchPill } from '@/components/public/PublicSearchPill';

export type HeroSearchProps = {
  compact?: boolean;
  defaultQuery?: string;
  defaultOperacion?: string;
  defaultTipo?: string;
  barrios?: string[];
  /** Clases del pill en modo completo (home). */
  formClassName?: string;
};

export default function HeroSearch({
  compact = false,
  defaultQuery = '',
  defaultOperacion = '',
  defaultTipo = '',
  barrios,
  formClassName,
}: HeroSearchProps) {
  const compactPillClass =
    'mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/95 p-3 shadow-xl backdrop-blur-md md:flex md:flex-row md:items-end md:gap-0 md:divide-x md:divide-gray-200 md:rounded-full md:p-2';

  const fullPillClass =
    formClassName ??
    'relative z-10 mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 overflow-visible rounded-3xl border-0 bg-white p-4 shadow-xl md:flex md:flex-row md:items-end md:gap-0 md:divide-x md:divide-gray-200/90 md:rounded-full md:border md:border-white/30 md:bg-white/92 md:p-3 md:shadow-2xl md:backdrop-blur-xl';

  if (compact) {
    return (
      <div className="border-b border-border-light bg-background/95 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PublicSearchPill
            formClassName={compactPillClass}
            defaultQuery={defaultQuery}
            defaultOperacion={defaultOperacion}
            defaultTipo={defaultTipo}
            barrios={barrios}
          />
        </div>
      </div>
    );
  }

  return (
    <PublicSearchPill
      formClassName={fullPillClass}
      defaultQuery={defaultQuery}
      defaultOperacion={defaultOperacion}
      defaultTipo={defaultTipo}
      barrios={barrios}
    />
  );
}
