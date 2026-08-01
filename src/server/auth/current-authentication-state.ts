import { prisma } from '@/lib/prisma';
import { currentUserInclude, type CurrentUser } from '@/types/auth';

export type CurrentAuthenticationState = {
  user: CurrentUser;
  sessionVersion: number;
  tenantId: string | null;
};

export async function loadCurrentAuthenticationState(
  userId: string,
  expectedSessionVersion: number,
): Promise<CurrentAuthenticationState | null> {
  if (!Number.isSafeInteger(expectedSessionVersion) || expectedSessionVersion < 0) return null;
  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: { ...currentUserInclude, authSessionVersion: true },
  });
  if (
    !account?.activo ||
    !account.authSessionVersion ||
    account.authSessionVersion.version !== expectedSessionVersion
  ) {
    return null;
  }
  const { authSessionVersion, ...user } = account;
  const tenantId = user.rol === 'INMOBILIARIA'
    ? user.inmobiliariaPerfil?.id ?? null
    : user.rol === 'AGENTE'
      ? user.agenciaId
      : null;
  return { user, sessionVersion: authSessionVersion.version, tenantId };
}
