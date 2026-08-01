import type { PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type Client = Pick<PrismaClient, 'passwordResetToken'>;

export function createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }, client: Client = prisma) {
  return client.passwordResetToken.create({ data: input, select: { id: true, userId: true, expiresAt: true, createdAt: true } });
}

export function findValidPasswordResetTokenByHash(tokenHash: string, now = new Date(), client: Client = prisma) {
  return client.passwordResetToken.findFirst({ where: { tokenHash, consumedAt: null, expiresAt: { gt: now } }, select: { id: true, userId: true, expiresAt: true } });
}

export async function consumePasswordResetToken(tokenHash: string, now = new Date(), client: Client = prisma): Promise<boolean> {
  return (await client.passwordResetToken.updateMany({ where: { tokenHash, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } })).count === 1;
}

export async function invalidateOutstandingPasswordResetTokens(userId: string, now = new Date(), client: Client = prisma): Promise<number> {
  return (await client.passwordResetToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } })).count;
}
