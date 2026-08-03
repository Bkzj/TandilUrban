import { compare } from 'bcryptjs';
import { Prisma, type PrismaClient } from '@/generated/prisma';
import { decryptTotpSecret, hashRecoveryCode, verifyTotp } from '@/lib/auth-security';
import {
  listActiveAuthSessions,
  revokeAuthSessionForUser,
} from '@/server/auth-security/auth-session-repository';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

class SessionManagementConflict extends Error {}

export async function getUserActiveSessions(input: {
  userId: string;
  sessionVersion: number;
  currentSessionId: string;
  now?: Date;
}, client: PrismaClient) {
  const now = input.now ?? new Date();
  const rows = await listActiveAuthSessions(input.userId, input.sessionVersion, now, client);
  return rows
    .map((row) => ({ ...row, current: row.id === input.currentSessionId }))
    .sort((left, right) => Number(right.current) - Number(left.current) || right.lastSeenAt.getTime() - left.lastSeenAt.getTime());
}

export async function revokeOtherUserSession(input: {
  userId: string;
  currentSessionId: string;
  targetSessionId: string;
  requestId?: string;
  now?: Date;
}, client: PrismaClient): Promise<'revoked' | 'unavailable'> {
  const now = input.now ?? new Date();
  return client.$transaction(async (tx) => {
    const revoked = await revokeAuthSessionForUser({
      userId: input.userId,
      currentSessionId: input.currentSessionId,
      targetSessionId: input.targetSessionId,
      reason: 'USER_REVOKED',
      now,
    }, tx);
    if (!revoked) return 'unavailable';
    await recordSecurityEvent({ userId: input.userId, type: 'SESSION_REVOKED', requestId: input.requestId, category: 'individual' }, tx);
    return 'revoked';
  });
}

type BulkInput = {
  userId: string;
  currentSessionId: string;
  expectedSessionVersion: number;
  password: string;
  factor?: 'totp' | 'recovery';
  code?: string;
};

type BulkOptions = {
  client: PrismaClient;
  encryptionKey: string;
  includeCurrent: boolean;
  requestId?: string;
  now?: Date;
};

export async function revokeUserSessionsBulk(input: BulkInput, options: BulkOptions) {
  const now = options.now ?? new Date();
  const account = await options.client.user.findUnique({
    where: { id: input.userId },
    include: { authSessionVersion: true, twoFactorConfiguration: true },
  });
  if (!account?.activo || account.authSessionVersion?.version !== input.expectedSessionVersion) return { status: 'invalid' } as const;
  if (!(await compare(input.password, account.passwordHash))) return { status: 'invalid' } as const;

  const configuration = account.twoFactorConfiguration?.enabledAt && account.twoFactorConfiguration.verifiedAt
    ? account.twoFactorConfiguration
    : null;
  let acceptedStep: bigint | null = null;
  let recoveryHash: string | null = null;
  if (configuration) {
    if (!input.factor || !input.code) return { status: 'second_factor_required' } as const;
    if (input.factor === 'totp') {
      try {
        acceptedStep = verifyTotp(
          decryptTotpSecret(configuration.secretEncrypted, options.encryptionKey),
          input.code,
          now.getTime(),
          1,
        );
      } catch {
        acceptedStep = null;
      }
      if (acceptedStep === null) return { status: 'invalid' } as const;
    } else {
      recoveryHash = hashRecoveryCode(input.code);
    }
  }

  try {
    const result = await options.client.$transaction(async (tx) => {
      const current = await tx.authSession.findFirst({
        where: {
          id: input.currentSessionId,
          userId: input.userId,
          sessionVersion: input.expectedSessionVersion,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true },
      });
      if (!current) throw new SessionManagementConflict();

      if (configuration && input.factor === 'totp') {
        const accepted = await tx.twoFactorConfiguration.updateMany({
          where: {
            id: configuration.id,
            enabledAt: { not: null },
            OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: acceptedStep! } }],
          },
          data: { lastAcceptedTimeStep: acceptedStep! },
        });
        if (accepted.count !== 1) throw new SessionManagementConflict();
      } else if (configuration && input.factor === 'recovery') {
        const accepted = await tx.twoFactorRecoveryCode.updateMany({
          where: { configurationId: configuration.id, codeHash: recoveryHash!, consumedAt: null },
          data: { consumedAt: now },
        });
        if (accepted.count !== 1) throw new SessionManagementConflict();
      }

      const revoked = await tx.authSession.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null,
          ...(options.includeCurrent ? {} : { id: { not: input.currentSessionId } }),
        },
        data: {
          revokedAt: now,
          revokedReason: options.includeCurrent ? 'ALL_SESSIONS' : 'OTHER_SESSIONS',
        },
      });
      await tx.twoFactorChallenge.updateMany({
        where: { userId: input.userId, consumedAt: null },
        data: { consumedAt: now },
      });
      if (options.includeCurrent) {
        const version = await tx.authSessionVersion.updateMany({
          where: { userId: input.userId, version: input.expectedSessionVersion },
          data: { version: { increment: 1 } },
        });
        if (version.count !== 1) throw new SessionManagementConflict();
        await recordSecurityEvent({ userId: input.userId, type: 'SESSION_VERSION_INCREMENTED', requestId: options.requestId }, tx);
      }
      await recordSecurityEvent({
        userId: input.userId,
        type: options.includeCurrent ? 'ALL_SESSIONS_REVOKED' : 'OTHER_SESSIONS_REVOKED',
        requestId: options.requestId,
        category: configuration ? input.factor : 'password_only',
        metadata: { affectedSessions: revoked.count },
      }, tx);
      return revoked.count;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { status: 'revoked', count: result } as const;
  } catch (error) {
    if (error instanceof SessionManagementConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')) {
      return { status: 'invalid' } as const;
    }
    throw error;
  }
}
