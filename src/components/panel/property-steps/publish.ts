import type { PropertyFormData } from '@/types/panel';

export function publish(_data: PropertyFormData): void {
  // TODO: POST /api/propiedades — pendiente cablear con la inmobiliaria
  // del usuario logueado. No acoplo el onboarding al endpoint actual.
  // eslint-disable-next-line no-console
  console.info('publish() pendiente — datos listos:', _data);
}
