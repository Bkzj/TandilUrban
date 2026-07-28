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
  }, [addProperty, entry]);

  return null;
}
