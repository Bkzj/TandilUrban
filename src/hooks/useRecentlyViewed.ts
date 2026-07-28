'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { RecentPropertyDto } from '@/types/public-property';

const STORAGE_KEY = 'tandilurban:recent-properties';
const CHANGE_EVENT = 'propea:recent-properties-change';
const MAX_ITEMS = 6;
const EMPTY: RecentPropertyDto[] = [];
let cachedRaw: string | null | undefined;
let cachedItems: RecentPropertyDto[] = EMPTY;
export type RecentProperty = RecentPropertyDto;

function readStorage(): RecentPropertyDto[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedItems;
    cachedRaw = raw;
    if (!raw) return (cachedItems = EMPTY);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return (cachedItems = EMPTY);
    cachedItems = parsed.filter(
      (item): item is RecentPropertyDto =>
        item != null && typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).titulo === 'string',
    );
    return cachedItems;
  } catch {
    return (cachedItems = EMPTY);
  }
}

function writeStorage(items: RecentPropertyDto[]) {
  try {
    const raw = JSON.stringify(items);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedItems = items;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* quota / private mode */
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = () => onStoreChange();
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStorage);
  };
}

export function useRecentlyViewed() {
  const recentProperties = useSyncExternalStore(subscribe, readStorage, () => EMPTY);
  const addProperty = useCallback((prop: RecentPropertyDto) => {
    const without = readStorage().filter((item) => item.id !== prop.id);
    writeStorage([prop, ...without].slice(0, MAX_ITEMS));
  }, []);
  return { recentProperties, addProperty };
}
