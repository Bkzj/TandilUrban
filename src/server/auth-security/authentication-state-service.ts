import type { PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

export async function invalidateUserAuthenticationState(userId: string, client: PrismaClient = prisma): Promise<number | null> {
  return client.$transaction(async (tx) => {
    const userExists = (await tx.user.count({ where: { id: userId } })) === 1;
    if (!userExists) return null;
    const version = await tx.authSessionVersion.upsert({
      where: { userId },
      create: { userId, version: 1 },
      update: { version: { increment: 1 } },
      select: { version: true },
    });
    await tx.twoFactorChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    await recordSecurityEvent({ userId, type: 'SESSION_VERSION_INCREMENTED' }, tx);
    return version.version;
  });
}

export async function disableTotpSecurityFoundation(userId: string, client: PrismaClient = prisma): Promise<boolean> {
  return client.$transaction(async (tx) => {
    await tx.twoFactorChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    const removed = await tx.twoFactorConfiguration.deleteMany({ where: { userId } });
    if (removed.count !== 1) return false;
    await tx.authSessionVersion.upsert({
      where: { userId },
      create: { userId, version: 1 },
      update: { version: { increment: 1 } },
    });
    await recordSecurityEvent({ userId, type: 'TWO_FACTOR_DISABLED' }, tx);
    return true;
  });
}

export async function regenerateRecoveryCodesFoundation(
  input: { userId: string; configurationId: string; batchId: string; codeHashes: readonly string[]; now?: Date },
  client: PrismaClient = prisma,
): Promise<{ created: number; sessionVersion: number } | null> {
  const now = input.now ?? new Date();
  return client.$transaction(async (tx) => {
    const configuration = await tx.twoFactorConfiguration.findFirst({
      where: { id: input.configurationId, userId: input.userId, enabledAt: { not: null } },
      select: { id: true },
    });
    if (!configuration) return null;
    await tx.twoFactorRecoveryCode.updateMany({
      where: { configurationId: input.configurationId, consumedAt: null },
      data: { consumedAt: now },
    });
    const created = await tx.twoFactorRecoveryCode.createMany({
      data: input.codeHashes.map((codeHash) => ({
        configurationId: input.configurationId,
        batchId: input.batchId,
        codeHash,
      })),
    });
    const version = await tx.authSessionVersion.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, version: 1 },
      update: { version: { increment: 1 } },
      select: { version: true },
    });
    await recordSecurityEvent({ userId: input.userId, type: 'RECOVERY_CODES_REGENERATED' }, tx);
    return { created: created.count, sessionVersion: version.version };
  });
}
