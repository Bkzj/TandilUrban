import { RolUsuario } from '@prisma/client';

import type { CurrentUser } from '@/types/auth';

/** `inmobiliariaId` efectivo del usuario en el panel (main o agente). */
export function resolvePanelTenantInmobiliariaId(user: CurrentUser): string | null {
  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    return user.inmobiliariaPerfil.id;
  }
  if (user.rol === RolUsuario.AGENTE && user.agenciaId) {
    return user.agenciaId;
  }
  return null;
}
