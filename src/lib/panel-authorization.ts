import 'server-only';

import { RolUsuario, type Prisma } from '@prisma/client';

import { AuthError, getCurrentUser } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';

export type AuthenticatedAuthorizationContext = {
  user: CurrentUser;
};

export type PanelAuthorizationContext = AuthenticatedAuthorizationContext & {
  role: RolUsuario;
};

export type PanelTenantAuthorizationContext = PanelAuthorizationContext & {
  tenantId: string;
  propertyWhere: Prisma.PropiedadWhereInput;
};

export type GlobalAdminAuthorizationContext = AuthenticatedAuthorizationContext & {
  role: RolUsuario;
};

export function panelPropertyScopeForUser(
  user: CurrentUser,
): Prisma.PropiedadWhereInput | null {
  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    return { inmobiliariaId: user.inmobiliariaPerfil.id };
  }
  if (user.rol === RolUsuario.AGENTE && user.agenciaId) {
    return { inmobiliariaId: user.agenciaId, agenteId: user.id };
  }
  return null;
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedAuthorizationContext> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, 'Tenés que iniciar sesión.');
  return { user };
}

export async function requirePanelUser(): Promise<PanelAuthorizationContext> {
  const { user } = await requireAuthenticatedUser();
  if (user.rol !== RolUsuario.INMOBILIARIA && user.rol !== RolUsuario.AGENTE) {
    throw new AuthError(403, 'Tu cuenta no puede acceder a datos de inmobiliarias.');
  }
  return { user, role: user.rol };
}

export async function requirePanelTenant(): Promise<PanelTenantAuthorizationContext> {
  const context = await requirePanelUser();
  const { user } = context;

  const propertyWhere = panelPropertyScopeForUser(user);
  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil && propertyWhere) {
    return {
      ...context,
      tenantId: user.inmobiliariaPerfil.id,
      propertyWhere,
    };
  }
  if (user.rol === RolUsuario.AGENTE && user.agenciaId && propertyWhere) {
    return {
      ...context,
      tenantId: user.agenciaId,
      propertyWhere,
    };
  }

  throw new AuthError(403, 'Tu cuenta no tiene una inmobiliaria activa.');
}

export async function requirePropertyAccess(
  propertyId: string,
): Promise<PanelTenantAuthorizationContext & { propertyWhere: Prisma.PropiedadWhereInput }> {
  const context = await requirePanelTenant();
  return {
    ...context,
    propertyWhere: { AND: [context.propertyWhere, { id: propertyId }] },
  };
}

export async function requireGlobalAdmin(): Promise<GlobalAdminAuthorizationContext> {
  const { user } = await requireAuthenticatedUser();
  if (user.rol !== RolUsuario.ADMIN) {
    throw new AuthError(403, 'Se requiere administración global.');
  }
  return { user, role: RolUsuario.ADMIN };
}

export async function requireTenantAdministrator() {
  const context = await requirePanelTenant();
  if (
    context.user.rol !== RolUsuario.INMOBILIARIA ||
    !context.user.inmobiliariaPerfil
  ) {
    throw new AuthError(403, 'Solo el administrador de la inmobiliaria puede acceder.');
  }
  return {
    user: context.user,
    inmobiliaria: context.user.inmobiliariaPerfil,
    inmobiliariaId: context.tenantId,
  };
}
