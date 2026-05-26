'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tandilurban:recent-properties';
const MAX_ITEMS = 6;

export type RecentProperty = {
  id: string;
  titulo: string;
  precio: string;
  tipoOperacion: string;
  imagen: string;
};

function readStorage(): RecentProperty[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentProperty =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as RecentProperty).id === 'string' &&
        typeof (item as RecentProperty).titulo === 'string',
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentProperty[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function useRecentlyViewed() {
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);

  useEffect(() => {
    setRecentProperties(readStorage());
  }, []);

  const addProperty = useCallback((prop: RecentProperty) => {
    setRecentProperties((prev) => {
      const without = prev.filter((p) => p.id !== prop.id);
      const next = [prop, ...without].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  return { recentProperties, addProperty };
}
