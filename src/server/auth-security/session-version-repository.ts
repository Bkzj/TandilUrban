import { Prisma, type PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type Client = Pick<PrismaClient, 'authSessionVersion'>;

export async function getSessionVersion(userId: string, client: Client = prisma): Promise<number | null> {
  return (await client.authSessionVersion.findUnique({ where: { userId }, select: { version: true } }))?.version ?? null;
}

export async function ensureSessionVersion(userId: string, client: Client = prisma): Promise<number> {
  return (await client.authSessionVersion.upsert({ where: { userId }, create: { userId }, update: {}, select: { version: true } })).version;
}

export async function matchesSessionVersion(userId: string, expectedVersion: number, client: Client = prisma): Promise<boolean> {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return false;
  return (await client.authSessionVersion.count({ where: { userId, version: expectedVersion } })) === 1;
}

export async function incrementSessionVersion(userId: string, client: Client = prisma): Promise<number | null> {
  try {
    const result = await client.authSessionVersion.update({
      where: { userId },
      data: { version: { increment: 1 } },
      select: { version: true },
    });
    return result.version;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null;
    throw error;
  }
}
