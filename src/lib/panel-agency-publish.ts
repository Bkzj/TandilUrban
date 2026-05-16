import { RolUsuario } from '@prisma/client';

import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';

/**
 * Usuario autenticado con contexto de agencia para publicar / subir en el panel.
 * Multi-tenant: INMOBILIARIA (perfil) o AGENTE con agencia asignada.
 */
export async function requireAgencyPublishingContext() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, 'Tenés que iniciar sesión.');
  }

  assertNotPublicPortalUser(user);

  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    return { user, inmobiliariaId: user.inmobiliariaPerfil.id };
  }
  if (user.rol === RolUsuario.AGENTE && user.agenciaId) {
    return { user, inmobiliariaId: user.agenciaId };
  }

  throw new AuthError(403, 'Tu cuenta no puede publicar propiedades.');
}
