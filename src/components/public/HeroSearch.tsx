'use client';

import { PREMIUM_PILL_CLASS, PublicSearchPill } from '@/components/public/PublicSearchPill';

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
    'mx-auto flex w-full max-w-5xl flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl md:flex-row md:gap-0 md:rounded-full md:p-2';

  const fullPillClass = formClassName ?? PREMIUM_PILL_CLASS;

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
