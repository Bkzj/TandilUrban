import { RolUsuario, type PrismaClient } from '@/generated/prisma';

import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

export type GlobalAdminPromotionResult =
  | { status: 'promoted'; previousRole: RolUsuario; version: number; revokedSessions: number }
  | { status: 'already_admin'; previousRole: RolUsuario; version: number; revokedSessions: 0 };

export async function promoteExistingGlobalAdmin(
  normalizedEmail: string,
  client: PrismaClient,
): Promise<GlobalAdminPromotionResult> {
  const matches = await client.user.findMany({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    select: { id: true, rol: true, inmobiliariaPerfil: { select: { id: true } }, authSessionVersion: { select: { version: true } } },
    take: 2,
  });
  if (matches.length !== 1) throw new Error(matches.length === 0 ? 'No existe una cuenta coincidente.' : 'La búsqueda es ambigua; no se modificó ninguna cuenta.');
  const account = matches[0];
  if (!account) throw new Error('No existe una cuenta coincidente.');
  if (account.rol === RolUsuario.ADMIN) {
    return { status: 'already_admin', previousRole: account.rol, version: account.authSessionVersion?.version ?? 0, revokedSessions: 0 };
  }
  if (account.inmobiliariaPerfil) throw new Error('La cuenta administra una inmobiliaria. Asigná primero otro administrador para evitar dejar el tenant sin dueño.');

  return client.$transaction(async (tx) => {
    await tx.user.update({ where: { id: account.id }, data: { rol: RolUsuario.ADMIN, agenciaId: null } });
    const version = await tx.authSessionVersion.upsert({ where: { userId: account.id }, create: { userId: account.id, version: 1 }, update: { version: { increment: 1 } }, select: { version: true } });
    const revoked = await tx.authSession.updateMany({ where: { userId: account.id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'ROLE_CHANGED' } });
    await tx.twoFactorChallenge.updateMany({ where: { userId: account.id, consumedAt: null }, data: { consumedAt: new Date() } });
    await recordSecurityEvent({ userId: account.id, actorUserId: account.id, targetUserId: account.id, type: 'ROLE_CHANGED', category: `${account.rol}_TO_ADMIN` }, tx);
    await recordSecurityEvent({ userId: account.id, actorUserId: account.id, targetUserId: account.id, type: 'GLOBAL_ADMIN_PROMOTED' }, tx);
    return { status: 'promoted' as const, previousRole: account.rol, version: version.version, revokedSessions: revoked.count };
  });
}
