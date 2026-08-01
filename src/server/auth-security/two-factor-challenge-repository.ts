import type { PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type Client = Pick<PrismaClient, 'twoFactorChallenge'>;

export function createTwoFactorChallenge(input: { userId: string; tokenHash: string; expiresAt: Date; purpose?: string }, client: Client = prisma) {
  return client.twoFactorChallenge.create({ data: input, select: { id: true, userId: true, expiresAt: true, purpose: true, maxAttempts: true } });
}

export function findValidTwoFactorChallenge(tokenHash: string, purpose: string, now = new Date(), client: Client = prisma) {
  return client.twoFactorChallenge.findFirst({ where: { tokenHash, purpose, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 } }, select: { id: true, userId: true, attempts: true, maxAttempts: true, expiresAt: true } });
}

export async function incrementChallengeAttempts(id: string, client: Client = prisma): Promise<boolean> {
  return (await client.twoFactorChallenge.updateMany({ where: { id, consumedAt: null, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } })).count === 1;
}

export async function consumeTwoFactorChallenge(id: string, now = new Date(), client: Client = prisma): Promise<boolean> {
  return (await client.twoFactorChallenge.updateMany({ where: { id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 } }, data: { consumedAt: now } })).count === 1;
}

export async function invalidatePendingChallenges(userId: string, now = new Date(), client: Client = prisma): Promise<number> {
  return (await client.twoFactorChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } })).count;
}
