import { RolUsuario } from '@/generated/prisma';

export type AdministrativeActor = {
  id: string;
  rol: RolUsuario;
  activo: boolean;
  tenantId: string | null;
};

export function canAccessGlobalAdministration(actor: AdministrativeActor): boolean {
  return actor.activo && actor.rol === RolUsuario.ADMIN;
}

export function canInviteAgent(actor: AdministrativeActor, targetTenantId: string): boolean {
  return actor.activo && (
    actor.rol === RolUsuario.ADMIN ||
    (actor.rol === RolUsuario.INMOBILIARIA && actor.tenantId === targetTenantId)
  );
}

export function canManageAccountStatus(
  actor: AdministrativeActor,
  target: { id: string; rol: RolUsuario; tenantId: string | null },
): boolean {
  if (!actor.activo || actor.id === target.id || target.rol === RolUsuario.ADMIN) return false;
  return actor.rol === RolUsuario.ADMIN || (
    actor.rol === RolUsuario.INMOBILIARIA &&
    target.rol === RolUsuario.AGENTE &&
    actor.tenantId !== null &&
    actor.tenantId === target.tenantId
  );
}

export function allowedAdministrativeRoleTransition(
  actorRole: RolUsuario,
  from: RolUsuario,
  to: RolUsuario,
): boolean {
  if (actorRole !== RolUsuario.ADMIN || to === RolUsuario.ADMIN || from === RolUsuario.ADMIN) return false;
  return (
    (from === RolUsuario.USUARIO_NORMAL && (to === RolUsuario.INMOBILIARIA || to === RolUsuario.AGENTE)) ||
    (from === RolUsuario.AGENTE && to === RolUsuario.USUARIO_NORMAL)
  );
}
