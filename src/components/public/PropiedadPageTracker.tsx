'use client';

import { useEffect } from 'react';

import { useRecentlyViewed, type RecentProperty } from '@/hooks/useRecentlyViewed';

type PropiedadPageTrackerProps = {
  entry: RecentProperty;
};

export function PropiedadPageTracker({ entry }: PropiedadPageTrackerProps) {
  const { addProperty } = useRecentlyViewed();

  useEffect(() => {
    addProperty(entry);
  }, [addProperty, entry]);

  return null;
}
