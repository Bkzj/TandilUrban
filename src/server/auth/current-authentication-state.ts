import { prisma } from '@/lib/prisma';
import { hashAuthSecret } from '@/lib/auth-security';
import { findActiveAuthSessionByHash, touchAuthSession } from '@/server/auth-security/auth-session-repository';
import { currentUserInclude, type CurrentUser } from '@/types/auth';

export type CurrentAuthenticationState = {
  user: CurrentUser;
  sessionVersion: number;
  tenantId: string | null;
};

export type CurrentSessionAuthenticationState = CurrentAuthenticationState & {
  authSessionId: string;
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

export async function loadCurrentSessionAuthenticationState(
  userId: string,
  expectedSessionVersion: number,
  rawSessionIdentifier: string,
  now = new Date(),
): Promise<CurrentSessionAuthenticationState | null> {
  const state = await loadCurrentAuthenticationState(userId, expectedSessionVersion);
  if (!state || rawSessionIdentifier.length < 32 || rawSessionIdentifier.length > 256) return null;
  const session = await findActiveAuthSessionByHash(
    userId,
    hashAuthSecret(rawSessionIdentifier),
    expectedSessionVersion,
    now,
  );
  if (!session) return null;
  await touchAuthSession(session.id, session.lastSeenAt, now);
  return { ...state, authSessionId: session.id };
}
