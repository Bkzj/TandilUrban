import { type Prisma, type PrismaClient } from '@/generated/prisma';

import { hashVerificationToken, issueVerificationToken, VERIFICATION_TOKEN_TTL_MS } from '@/lib/auth-verification';
import { type AuthEmailAdapter, sendVerificationEmail } from '@/lib/mail';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

type VerificationResult =
  | { status: 'verified'; userId: string }
  | { status: 'invalid' };

async function locateVerificationToken(
  rawToken: string,
  client: Prisma.TransactionClient,
) {
  const tokenHash = hashVerificationToken(rawToken);
  const hashed = await client.verificationToken.findUnique({ where: { token: tokenHash } });
  if (hashed) return hashed;
  const legacy = await client.verificationToken.findUnique({ where: { token: rawToken } });
  if (!legacy) return null;
  const upgraded = await client.verificationToken.updateMany({
    where: { id: legacy.id, token: rawToken },
    data: { token: tokenHash },
  });
  if (upgraded.count === 1) return { ...legacy, token: tokenHash };
  return client.verificationToken.findUnique({ where: { token: tokenHash } });
}

export async function verifyEmailToken(
  rawToken: string,
  options: { client: PrismaClient; requestId?: string; now?: Date },
): Promise<VerificationResult> {
  const now = options.now ?? new Date();
  return options.client.$transaction(async (tx) => {
    const token = await locateVerificationToken(rawToken, tx);
    if (!token || token.consumedAt || token.invalidatedAt || token.expiresAt <= now) {
      return { status: 'invalid' };
    }
    const user = token.userId
      ? await tx.user.findUnique({ where: { id: token.userId }, select: { id: true, activo: true } })
      : await tx.user.findFirst({
          where: { email: { equals: token.email, mode: 'insensitive' } },
          select: { id: true, activo: true },
        });
    if (!user?.activo) return { status: 'invalid' };

    const consumed = await tx.verificationToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) return { status: 'invalid' };
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    await recordSecurityEvent(
      { userId: user.id, type: 'EMAIL_VERIFIED', requestId: options.requestId },
      tx,
    );
    return { status: 'verified', userId: user.id };
  });
}

export async function resendAccountVerification(
  email: string,
  options: {
    client: PrismaClient;
    emailAdapter?: AuthEmailAdapter;
    requestId?: string;
    now?: Date;
    verificationTtlMs?: number;
  },
): Promise<{ eligible: boolean; deliverySucceeded: boolean }> {
  const now = options.now ?? new Date();
  const normalizedEmail = email.normalize('NFKC').trim().toLowerCase();
  const verificationTtlMs = options.verificationTtlMs ?? VERIFICATION_TOKEN_TTL_MS;
  const user = await options.client.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    select: { id: true, email: true, activo: true, emailVerifiedAt: true },
  });
  if (!user?.activo || user.emailVerifiedAt !== null) {
    return { eligible: false, deliverySucceeded: false };
  }
  const issued = issueVerificationToken(now.getTime(), verificationTtlMs);
  await options.client.$transaction(async (tx) => {
    await tx.verificationToken.updateMany({
      where: { userId: user.id, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.verificationToken.create({
      data: {
        userId: user.id,
        email: user.email,
        token: issued.tokenHash,
        expiresAt: issued.expiresAt,
      },
    });
    await recordSecurityEvent(
      { userId: user.id, type: 'VERIFICATION_REQUESTED', requestId: options.requestId },
      tx,
    );
  });
  const delivery = options.emailAdapter
    ? await sendVerificationEmail(user.email, issued.rawToken, options.emailAdapter, verificationTtlMs / 3_600_000)
    : await sendVerificationEmail(user.email, issued.rawToken, undefined, verificationTtlMs / 3_600_000);
  return { eligible: true, deliverySucceeded: delivery.ok && delivery.delivered };
}
