'use client';

import { ReactLenis } from 'lenis/react';
import { SessionProvider } from 'next-auth/react';

import { useClientMounted } from '@/hooks/use-client-mounted';

export function Providers({ children }: { children: React.ReactNode }) {
  const lenisReady = useClientMounted();

  return (
    <SessionProvider refetchOnWindowFocus={false}>
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
          {children}
        </ReactLenis>
      ) : (
        children
      )}
    </SessionProvider>
  );
}
