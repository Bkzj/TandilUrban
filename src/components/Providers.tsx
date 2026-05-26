'use client';

import type { ComponentPropsWithoutRef } from 'react';

import ReactLenis from '@studio-freight/react-lenis';
import { SessionProvider } from 'next-auth/react';
import { useClientMounted } from '@/hooks/use-client-mounted';

type LenisChild = Exclude<
  ComponentPropsWithoutRef<typeof ReactLenis>['children'],
  undefined
>;

/** react-lenis publica typings de React 18; proyecto en React 19 — acotamos sólo dentro del Lenis wrapper. */
function lenisClamp(children: React.ReactNode): LenisChild {
  return children as unknown as LenisChild;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const lenisReady = useClientMounted();

  return (
    <SessionProvider>
      {lenisReady ? (
        <ReactLenis
          root
          options={{
            lerp: 0.098,
            smoothWheel: true,
            gestureOrientation: 'vertical',
          }}
          autoRaf
        >
          {lenisClamp(children)}
        </ReactLenis>
      ) : (
        children
      )}
    </SessionProvider>
  );
}
