import type { Prisma, PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export const AUTH_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const AUTH_SESSION_TOUCH_INTERVAL_MS = 10 * 60 * 1_000;

type Client = Pick<Prisma.TransactionClient, 'authSession' | 'securityEvent'>;

export function createAuthSession(input: {
  userId: string;
  sessionHash: string;
  sessionVersion: number;
  browser: string;
  operatingSystem: string;
  issuedAt: Date;
  expiresAt: Date;
}, client: Client = prisma) {
  return client.authSession.create({
    data: { ...input, lastSeenAt: input.issuedAt },
    select: { id: true, userId: true, sessionVersion: true, expiresAt: true },
  });
}

export function findActiveAuthSessionByHash(
  userId: string,
  sessionHash: string,
  sessionVersion: number,
  now = new Date(),
  client: Client = prisma,
) {
  return client.authSession.findFirst({
    where: { userId, sessionHash, sessionVersion, revokedAt: null, expiresAt: { gt: now } },
  });
}

export async function touchAuthSession(
  id: string,
  previousLastSeenAt: Date,
  now = new Date(),
  client: Client = prisma,
): Promise<boolean> {
  if (now.getTime() - previousLastSeenAt.getTime() < AUTH_SESSION_TOUCH_INTERVAL_MS) return false;
  return (await client.authSession.updateMany({
    where: { id, revokedAt: null, expiresAt: { gt: now }, lastSeenAt: previousLastSeenAt },
    data: { lastSeenAt: now },
  })).count === 1;
}

export function listActiveAuthSessions(userId: string, sessionVersion: number, now = new Date(), client: Client = prisma) {
  return client.authSession.findMany({
    where: { userId, sessionVersion, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true, browser: true, operatingSystem: true, issuedAt: true, lastSeenAt: true, expiresAt: true },
    orderBy: [{ lastSeenAt: 'desc' }, { issuedAt: 'desc' }],
  });
}

export async function revokeAuthSessionForUser(input: {
  userId: string;
  targetSessionId: string;
  currentSessionId: string;
  now?: Date;
  reason: string;
}, client: Client = prisma): Promise<boolean> {
  const now = input.now ?? new Date();
  return (await client.authSession.updateMany({
    where: {
      id: { equals: input.targetSessionId, not: input.currentSessionId },
      userId: input.userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { revokedAt: now, revokedReason: input.reason.slice(0, 32) },
  })).count === 1;
}

export async function revokeCurrentAuthSessionByHash(
  userId: string,
  sessionHash: string,
  now = new Date(),
  client: Client = prisma,
): Promise<boolean> {
  return (await client.authSession.updateMany({
    where: { userId, sessionHash, revokedAt: null },
    data: { revokedAt: now, revokedReason: 'LOGOUT' },
  })).count === 1;
}

export async function revokeAllUserAuthSessions(
  userId: string,
  reason: string,
  now = new Date(),
  client: Client = prisma,
): Promise<number> {
  return (await client.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now, revokedReason: reason.slice(0, 32) },
  })).count;
}

export async function cleanupAuthSessions(input: {
  now?: Date;
  retentionDays: number;
  apply: boolean;
}, client: PrismaClient = prisma): Promise<{ candidates: number; deleted: number }> {
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - input.retentionDays * 86_400_000);
  const where: Prisma.AuthSessionWhereInput = {
    OR: [
      { revokedAt: { lt: cutoff } },
      { revokedAt: null, expiresAt: { lt: cutoff } },
    ],
  };
  const candidates = await client.authSession.count({ where });
  const deleted = input.apply ? (await client.authSession.deleteMany({ where })).count : 0;
  return { candidates, deleted };
}
