import type { Metadata } from 'next';

import { ProximamenteScreen } from '@/components/public/ProximamenteScreen';

export const metadata: Metadata = {
  title: 'Servicios | Propea Group',
  description: 'Servicios inmobiliarios — próximamente en Propea Group.',
};

export default function ServiciosPage() {
  return (
    <ProximamenteScreen
      title="Servicios"
      description="Pronto vas a poder conocer tasaciones, asesoramiento y más servicios para compradores y vendedores."
    />
  );
}
