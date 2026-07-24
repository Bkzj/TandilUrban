'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** Evita que Recharts mida el contenedor antes de la hidratación. */
export function useChartMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
