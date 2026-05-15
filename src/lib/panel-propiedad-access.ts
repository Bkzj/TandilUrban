import { RolUsuario } from '@prisma/client';

import type { CurrentUser } from '@/types/auth';

type PropiedadAccessRow = {
  inmobiliariaId: string;
  agenteId: string | null;
};

/** Misma política multi-tenant que DELETE para editar/borrar. */
export function userCanModifyPropiedad(user: CurrentUser, propiedad: PropiedadAccessRow): boolean {
  if (user.rol === RolUsuario.AGENTE && user.agenciaId) {
    return propiedad.agenteId === user.id && propiedad.inmobiliariaId === user.agenciaId;
  }
  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    return propiedad.inmobiliariaId === user.inmobiliariaPerfil.id;
  }
  if (user.rol === RolUsuario.ADMIN && user.inmobiliariaPerfil) {
    return propiedad.inmobiliariaId === user.inmobiliariaPerfil.id;
  }
  return false;
}
