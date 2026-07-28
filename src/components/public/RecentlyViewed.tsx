'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { RecentPropertyDto } from '@/types/public-property';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=600&auto=format&fit=crop';

type RecentlyViewedProps = {
  excludeId?: string;
};

export function RecentlyViewed({ excludeId }: RecentlyViewedProps) {
  const { recentProperties } = useRecentlyViewed();
  const [verifiedItems, setVerifiedItems] = useState<RecentPropertyDto[]>([]);

  useEffect(() => {
    const ids = recentProperties.map(({ id }) => id);
    if (ids.length === 0) {
      return;
    }

    const controller = new AbortController();
    void fetch('/api/public/propiedades-recientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('propiedades' in payload)) return [];
        const propiedades = (payload as { propiedades?: unknown }).propiedades;
        return Array.isArray(propiedades) ? propiedades : [];
      })
      .then((items: unknown[]) => {
        const verified = items.filter(
          (item): item is RecentPropertyDto =>
            item != null &&
            typeof item === 'object' &&
            typeof (item as Record<string, unknown>).id === 'string' &&
            typeof (item as Record<string, unknown>).titulo === 'string' &&
            typeof (item as Record<string, unknown>).precio === 'string' &&
            typeof (item as Record<string, unknown>).tipoOperacion === 'string' &&
            typeof (item as Record<string, unknown>).imagen === 'string',
        );
        setVerifiedItems(verified);
      })
      .catch(() => setVerifiedItems([]));

    return () => controller.abort();
  }, [recentProperties]);

  const visibleItems = recentProperties.length === 0 ? [] : verifiedItems;
  const items = excludeId
    ? visibleItems.filter((p) => p.id !== excludeId)
    : visibleItems;

  if (items.length === 0) return null;

  return (
    <section className="mt-16 border-t border-gray-200 pt-12 sm:mt-20 sm:pt-14">
      <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">Vistos recientemente</h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 hide-scrollbar sm:gap-5">
        {items.map((prop) => (
          <Link
            key={prop.id}
            href={`/propiedades/${prop.id}`}
            className="group w-[min(72vw,220px)] shrink-0 sm:w-[200px]"
          >
            <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-md">
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prop.imagen || PLACEHOLDER}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-verde-dark shadow-sm">
                  {prop.tipoOperacion}
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                  {prop.titulo}
                </p>
                <p className="text-sm font-semibold text-naranja">{prop.precio}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
