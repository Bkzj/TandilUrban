import type { PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export async function createRecoveryCodeBatch(configurationId: string, batchId: string, codeHashes: readonly string[], client: PrismaClient = prisma): Promise<number> {
  return (await client.twoFactorRecoveryCode.createMany({ data: codeHashes.map((codeHash) => ({ configurationId, batchId, codeHash })) })).count;
}
export function countUnusedRecoveryCodes(configurationId: string, client: PrismaClient = prisma) { return client.twoFactorRecoveryCode.count({ where: { configurationId, consumedAt: null } }); }
export async function consumeRecoveryCodeByHash(configurationId: string, codeHash: string, now = new Date(), client: PrismaClient = prisma): Promise<boolean> { return (await client.twoFactorRecoveryCode.updateMany({ where: { configurationId, codeHash, consumedAt: null }, data: { consumedAt: now } })).count === 1; }
export async function invalidateRecoveryCodeBatch(configurationId: string, batchId: string, now = new Date(), client: PrismaClient = prisma): Promise<number> { return (await client.twoFactorRecoveryCode.updateMany({ where: { configurationId, batchId, consumedAt: null }, data: { consumedAt: now } })).count; }
export async function regenerateRecoveryCodeBatch(configurationId: string, batchId: string, codeHashes: readonly string[], now = new Date(), client: PrismaClient = prisma): Promise<number> {
  return client.$transaction(async (tx) => {
    await tx.twoFactorRecoveryCode.updateMany({ where: { configurationId, consumedAt: null }, data: { consumedAt: now } });
    return (await tx.twoFactorRecoveryCode.createMany({ data: codeHashes.map((codeHash) => ({ configurationId, batchId, codeHash })) })).count;
  });
}
