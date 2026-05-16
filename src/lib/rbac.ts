import { RolUsuario } from '@prisma/client';

/** Staff B2B: puede ver `/panel`. Excluye `USUARIO_NORMAL`. */
export function roleCanAccessPanel(rol: string | RolUsuario | undefined): boolean {
  const r = String(rol ?? '');
  return r === RolUsuario.ADMIN || r === RolUsuario.INMOBILIARIA || r === RolUsuario.AGENTE;
}
