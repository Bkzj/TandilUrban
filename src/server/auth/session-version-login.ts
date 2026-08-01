import { prisma } from '@/lib/prisma';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

export async function ensureLoginSessionVersion(userId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const inserted = await tx.authSessionVersion.createMany({
      data: [{ userId, version: 0 }],
      skipDuplicates: true,
    });
    const current = await tx.authSessionVersion.findUniqueOrThrow({
      where: { userId },
      select: { version: true },
    });
    if (inserted.count === 1) {
      await recordSecurityEvent({ userId, type: 'SESSION_VERSION_INITIALIZED' }, tx);
    }
    return current.version;
  });
}
