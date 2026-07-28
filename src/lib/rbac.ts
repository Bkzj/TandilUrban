import { RolUsuario } from '@prisma/client';

/** Panel de tenant: sólo inmobiliarias y agentes. ADMIN usa guard global separado. */
export function roleCanAccessPanel(rol: string | RolUsuario | undefined): boolean {
  const r = String(rol ?? '');
  return r === RolUsuario.INMOBILIARIA || r === RolUsuario.AGENTE;
}
