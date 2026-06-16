'use client';

import { useEffect, useState } from 'react';

/** Evita que Recharts mida el contenedor antes del layout (width/height -1). */
export function useChartMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
