'use client';

import { useEffect } from 'react';

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { RecentPropertyDto } from '@/types/public-property';

type PropiedadPageTrackerProps = {
  entry: RecentPropertyDto;
};

export function PropiedadPageTracker({ entry }: PropiedadPageTrackerProps) {
  const { addProperty } = useRecentlyViewed();

  useEffect(() => {
    addProperty(entry);
    void fetch(`/api/public/propiedades/${encodeURIComponent(entry.id)}/vista`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).catch(() => {
      // La analítica nunca debe impedir ni degradar la ficha pública.
    });
  }, [addProperty, entry]);

  return null;
}
