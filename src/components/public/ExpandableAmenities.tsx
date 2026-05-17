'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Car,
  Check,
  Shield,
  Snowflake,
  Sun,
  TreePine,
  UtensilsCrossed,
  Waves,
} from 'lucide-react';

const AMENITY_ICONS: Record<string, LucideIcon> = {
  Piscina: Waves,
  Quincho: UtensilsCrossed,
  Cochera: Car,
  Jardín: TreePine,
  Seguridad: Shield,
  Balcón: Sun,
  'Aire acondicionado': Snowflake,
};

const COLLAPSED_COUNT = 4;

function AmenityIcon({ label }: { label: string }) {
  const Icon = AMENITY_ICONS[label] ?? Check;
  return <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />;
}

type ExpandableAmenitiesProps = {
  items: string[];
};

export default function ExpandableAmenities({ items }: ExpandableAmenitiesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visible = isExpanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hasMore = items.length > COLLAPSED_COUNT;

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
        {visible.map((c) => (
          <div
            key={c}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm"
          >
            <AmenityIcon label={c} />
            <span className="text-sm font-medium">{c}</span>
          </div>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          className="mt-4 text-sm font-semibold text-verde transition-colors hover:text-verde-dark"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? 'Mostrar menos comodidades'
            : `Mostrar todas las ${items.length} comodidades`}
        </button>
      ) : null}
    </div>
  );
}
