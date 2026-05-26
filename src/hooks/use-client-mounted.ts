import { useSyncExternalStore } from 'react';

/** true solo en el cliente; evita setState en useEffect para mapas / Lenis. */
export function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
