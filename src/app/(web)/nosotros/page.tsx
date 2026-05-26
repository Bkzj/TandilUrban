import type { Metadata } from 'next';

import { ProximamenteScreen } from '@/components/public/ProximamenteScreen';

export const metadata: Metadata = {
  title: 'Nosotros | Propea Group',
  description: 'Conocé Propea Group — próximamente.',
};

export default function NosotrosPage() {
  return (
    <ProximamenteScreen
      title="Nosotros"
      description="Pronto vas a poder conocer más sobre Propea Group y nuestro equipo en Tandil."
    />
  );
}
