import type { PublicPropiedadListItem } from '@/types/public-search';

export type InmobiliariaProfilePublic = {
  userId: string;
  displayName: string;
  subtitle: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  email: string;
  telefono: string | null;
  rol: 'INMOBILIARIA' | 'AGENTE';
  agenciaNombre: string | null;
  propiedades: PublicPropiedadListItem[];
};
