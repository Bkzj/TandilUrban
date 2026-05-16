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
    'mx-auto flex w-full max-w-5xl flex-col gap-2 divide-y divide-gray-200 rounded-full border border-white/15 bg-white/95 p-2 shadow-xl backdrop-blur-md sm:flex-row sm:items-stretch sm:gap-0 sm:divide-x sm:divide-y-0';

  const fullPillClass =
    formClassName ??
    'relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-3 divide-y divide-gray-200/90 overflow-visible rounded-full border border-white/30 bg-white/92 p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-stretch sm:gap-0 sm:divide-x sm:divide-y-0';

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
