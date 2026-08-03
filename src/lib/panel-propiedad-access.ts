import { RolUsuario } from '@prisma/client';

export type PropertyAuthorizationUser = {
  id: string;
  rol: RolUsuario;
  agenciaId: string | null;
  inmobiliariaPerfil: { id: string } | null;
};

type PropiedadAccessRow = {
  inmobiliariaId: string;
  agenteId: string | null;
};

/** Misma política multi-tenant que DELETE para editar/borrar. */
export function userCanModifyPropiedad(
  user: PropertyAuthorizationUser,
  propiedad: PropiedadAccessRow,
): boolean {
  if (user.rol === RolUsuario.ADMIN) return true;
  if (user.rol === RolUsuario.AGENTE && user.agenciaId) {
    return propiedad.agenteId === user.id && propiedad.inmobiliariaId === user.agenciaId;
  }
  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    return propiedad.inmobiliariaId === user.inmobiliariaPerfil.id;
  }
  return false;
}
