import type { Prisma, PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type RootClient = PrismaClient;
type Client = Pick<Prisma.TransactionClient, 'twoFactorConfiguration'>;

export async function createPendingTotpConfiguration(input: { userId: string; secretEncrypted: string }, client: RootClient = prisma) {
  return client.$transaction(async (tx) => {
    await tx.twoFactorConfiguration.deleteMany({ where: { userId: input.userId, enabledAt: null } });
    return tx.twoFactorConfiguration.create({ data: input, select: { id: true, userId: true, createdAt: true } });
  });
}
export function getPendingTotpConfiguration(userId: string, client: Client = prisma) { return client.twoFactorConfiguration.findFirst({ where: { userId, enabledAt: null }, select: { id: true, userId: true, secretEncrypted: true, createdAt: true } }); }
export function getActiveTotpConfiguration(userId: string, client: Client = prisma) { return client.twoFactorConfiguration.findFirst({ where: { userId, enabledAt: { not: null }, verifiedAt: { not: null } }, select: { id: true, userId: true, secretEncrypted: true, lastAcceptedTimeStep: true } }); }
export async function activateTotpConfiguration(id: string, now = new Date(), client: Client = prisma): Promise<boolean> { return (await client.twoFactorConfiguration.updateMany({ where: { id, enabledAt: null }, data: { enabledAt: now, verifiedAt: now } })).count === 1; }
export async function acceptTotpTimeStep(id: string, step: bigint, client: Client = prisma): Promise<boolean> { return (await client.twoFactorConfiguration.updateMany({ where: { id, enabledAt: { not: null }, OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: step } }] }, data: { lastAcceptedTimeStep: step } })).count === 1; }
export async function disableTotpConfiguration(userId: string, client: RootClient = prisma): Promise<boolean> {
  return client.$transaction(async (tx) => {
    await tx.twoFactorChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    return (await tx.twoFactorConfiguration.deleteMany({ where: { userId } })).count === 1;
  });
}
