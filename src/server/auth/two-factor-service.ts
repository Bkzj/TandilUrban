import { compare } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';

import { Prisma, type PrismaClient } from '@/generated/prisma';
import {
  buildTotpProvisioningUri,
  createOpaqueToken,
  createRecoveryCodes,
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  formatTotpSecret,
  hashAuthSecret,
  hashRecoveryCode,
  verifyTotp,
} from '@/lib/auth-security';
import { isPrimaryCredentialValid, type AuthorizedCredentialsUser } from '@/lib/auth-credentials';
import {
  type AuthEmailAdapter,
  sendRecoveryCodesRegeneratedEmail,
  sendTwoFactorDisabledEmail,
  sendTwoFactorEnabledEmail,
} from '@/lib/mail';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import { revokeAllUserAuthSessions } from '@/server/auth-security/auth-session-repository';

type Options = {
  client: PrismaClient;
  encryptionKey: string;
  now?: Date;
  requestId?: string;
  emailAdapter?: AuthEmailAdapter;
};

type ManagementInput = { userId: string; expectedSessionVersion: number; password: string };
type FactorInput = { factor: 'totp' | 'recovery'; code: string };

class TwoFactorConflict extends Error {}

function authorizedUser(account: {
  id: string; nombre: string; email: string; avatarUrl: string | null; rol: string;
  agenciaId: string | null; inmobiliariaPerfil: { id: string } | null;
}, sessionVersion: number): AuthorizedCredentialsUser {
  return {
    id: account.id,
    name: account.nombre,
    email: account.email,
    image: account.avatarUrl,
    role: account.rol,
    tenantId: account.rol === 'INMOBILIARIA'
      ? account.inmobiliariaPerfil?.id ?? null
      : account.rol === 'AGENTE' ? account.agenciaId : null,
    sessionVersion,
  };
}

async function managementAccount(input: ManagementInput, client: PrismaClient) {
  const account = await client.user.findUnique({
    where: { id: input.userId },
    include: { authSessionVersion: true, twoFactorConfiguration: true },
  });
  if (!account?.activo || account.authSessionVersion?.version !== input.expectedSessionVersion) return null;
  if (!(await compare(input.password, account.passwordHash))) return null;
  return account;
}

export async function startTwoFactorSetup(
  input: ManagementInput,
  settings: Options & { issuer: string; setupTtlSeconds: number },
) {
  const now = settings.now ?? new Date();
  const account = await managementAccount(input, settings.client);
  if (!account) return { status: 'invalid' } as const;
  if (account.twoFactorConfiguration?.enabledAt && account.twoFactorConfiguration.verifiedAt) {
    return { status: 'already_enabled' } as const;
  }
  const secret = createTotpSecret();
  const secretEncrypted = encryptTotpSecret(secret, settings.encryptionKey);
  const expiresAt = new Date(now.getTime() + settings.setupTtlSeconds * 1_000);
  await settings.client.$transaction(async (tx) => {
    await tx.twoFactorConfiguration.deleteMany({ where: { userId: account.id, enabledAt: null } });
    await tx.twoFactorConfiguration.create({ data: { userId: account.id, secretEncrypted, createdAt: now, updatedAt: now } });
    await recordSecurityEvent({ userId: account.id, type: 'TWO_FACTOR_SETUP_STARTED', requestId: settings.requestId }, tx);
  });
  const provisioningUri = buildTotpProvisioningUri(secret, account.email, settings.issuer);
  const qrDataUrl = await QRCode.toDataURL(provisioningUri, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
  return { status: 'pending', manualKey: formatTotpSecret(secret), provisioningUri, qrDataUrl, expiresAt } as const;
}

export async function confirmTwoFactorSetup(
  input: { userId: string; expectedSessionVersion: number; code: string },
  settings: Options & { setupTtlSeconds: number; recoveryCodeCount: number },
) {
  const now = settings.now ?? new Date();
  const minimumCreatedAt = new Date(now.getTime() - settings.setupTtlSeconds * 1_000);
  const pending = await settings.client.twoFactorConfiguration.findFirst({
    where: { userId: input.userId, enabledAt: null, createdAt: { gte: minimumCreatedAt } },
  });
  if (!pending) return { status: 'invalid' } as const;
  let secret: string;
  try { secret = decryptTotpSecret(pending.secretEncrypted, settings.encryptionKey); }
  catch { return { status: 'invalid' } as const; }
  const step = verifyTotp(secret, input.code, now.getTime(), 1);
  if (step === null) return { status: 'invalid' } as const;
  const recoveryCodes = createRecoveryCodes(settings.recoveryCodeCount);
  const batchId = randomUUID();
  try {
    const sessionVersion = await settings.client.$transaction(async (tx) => {
      const activated = await tx.twoFactorConfiguration.updateMany({
        where: { id: pending.id, userId: input.userId, enabledAt: null, createdAt: { gte: minimumCreatedAt } },
        data: { enabledAt: now, verifiedAt: now, lastAcceptedTimeStep: step },
      });
      if (activated.count !== 1) throw new TwoFactorConflict();
      await tx.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({ configurationId: pending.id, batchId, codeHash: hashRecoveryCode(code) })),
      });
      const version = await tx.authSessionVersion.updateMany({
        where: { userId: input.userId, version: input.expectedSessionVersion },
        data: { version: { increment: 1 } },
      });
      if (version.count !== 1) throw new TwoFactorConflict();
      await tx.twoFactorChallenge.updateMany({ where: { userId: input.userId, consumedAt: null }, data: { consumedAt: now } });
      await revokeAllUserAuthSessions(input.userId, 'TWO_FACTOR_ENABLED', now, tx);
      await recordSecurityEvent({ userId: input.userId, type: 'TWO_FACTOR_ENABLED', requestId: settings.requestId }, tx);
      await recordSecurityEvent({ userId: input.userId, type: 'SESSION_VERSION_INCREMENTED', requestId: settings.requestId }, tx);
      return input.expectedSessionVersion + 1;
    });
    const account = await settings.client.user.findUnique({ where: { id: input.userId }, select: { email: true } });
    const notification = account
      ? await sendTwoFactorEnabledEmail(account.email, settings.emailAdapter)
      : { ok: true as const, delivered: false };
    return { status: 'enabled', recoveryCodes, sessionVersion, notificationSucceeded: notification.ok && notification.delivered } as const;
  } catch (error) {
    if (error instanceof TwoFactorConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) return { status: 'invalid' } as const;
    throw error;
  }
}

export async function beginTwoFactorLogin(
  input: { email: string; password: string },
  settings: Omit<Options, 'encryptionKey'> & { challengeTtlSeconds: number },
) {
  const now = settings.now ?? new Date();
  const account = await settings.client.user.findFirst({
    where: { email: { equals: input.email.normalize('NFKC').trim().toLowerCase(), mode: 'insensitive' } },
    include: { authSessionVersion: true, twoFactorConfiguration: true },
  });
  if (!(await isPrimaryCredentialValid(account, input.password))) return { status: 'invalid' } as const;
  const active = account?.twoFactorConfiguration?.enabledAt && account.twoFactorConfiguration.verifiedAt;
  if (!account || !active) return { status: 'normal' } as const;
  const version = account.authSessionVersion?.version;
  if (version === undefined) return { status: 'invalid' } as const;
  const rawToken = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + settings.challengeTtlSeconds * 1_000);
  await settings.client.$transaction(async (tx) => {
    await tx.twoFactorChallenge.updateMany({ where: { userId: account.id, purpose: 'LOGIN', consumedAt: null }, data: { consumedAt: now } });
    await tx.twoFactorChallenge.create({ data: { userId: account.id, tokenHash: hashAuthSecret(rawToken), sessionVersion: version, expiresAt, purpose: 'LOGIN' } });
    await recordSecurityEvent({ userId: account.id, type: 'TWO_FACTOR_CHALLENGE_CREATED', requestId: settings.requestId }, tx);
  });
  return { status: 'challenge', challengeToken: rawToken, expiresAt } as const;
}

async function rejectChallengeAttempt(
  challengeId: string,
  userId: string,
  maxAttempts: number,
  factor: 'totp' | 'recovery',
  now: Date,
  requestId: string | undefined,
  client: PrismaClient,
) {
  await client.$transaction(async (tx) => {
    const changed = await tx.twoFactorChallenge.updateMany({
      where: { id: challengeId, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (changed.count === 1) {
      const current = await tx.twoFactorChallenge.findUnique({ where: { id: challengeId }, select: { attempts: true, maxAttempts: true } });
      if (current && current.attempts >= current.maxAttempts) await tx.twoFactorChallenge.update({ where: { id: challengeId }, data: { consumedAt: now } });
    }
    await recordSecurityEvent({
      userId,
      type: factor === 'recovery' ? 'RECOVERY_CODE_LOGIN_FAILED' : 'TWO_FACTOR_CHALLENGE_FAILED',
      requestId,
      category: 'generic_second_factor_failure',
    }, tx);
  });
}

export async function completeTwoFactorLogin(
  input: { challengeToken: string; factor: 'totp' | 'recovery'; code: string },
  settings: Options,
): Promise<AuthorizedCredentialsUser | null> {
  const now = settings.now ?? new Date();
  const challenge = await settings.client.twoFactorChallenge.findFirst({
    where: { tokenHash: hashAuthSecret(input.challengeToken), purpose: 'LOGIN', consumedAt: null, expiresAt: { gt: now } },
    include: {
      user: {
        include: { authSessionVersion: true, twoFactorConfiguration: true, inmobiliariaPerfil: { select: { id: true } } },
      },
    },
  });
  const account = challenge?.user;
  const configuration = account?.twoFactorConfiguration;
  if (!challenge || challenge.attempts >= challenge.maxAttempts || !account?.activo || account.authSessionVersion?.version !== challenge.sessionVersion || !configuration?.enabledAt || !configuration.verifiedAt) return null;

  let step: bigint | null = null;
  let recoveryHash: string | null = null;
  if (input.factor === 'totp') {
    try { step = verifyTotp(decryptTotpSecret(configuration.secretEncrypted, settings.encryptionKey), input.code, now.getTime(), 1); }
    catch { step = null; }
  } else {
    recoveryHash = hashRecoveryCode(input.code);
  }
  if (input.factor === 'totp' && step === null) {
    await rejectChallengeAttempt(challenge.id, account.id, challenge.maxAttempts, input.factor, now, settings.requestId, settings.client);
    return null;
  }

  try {
    await settings.client.$transaction(async (tx) => {
      if (input.factor === 'totp') {
        const accepted = await tx.twoFactorConfiguration.updateMany({
          where: { id: configuration.id, enabledAt: { not: null }, OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: step! } }] },
          data: { lastAcceptedTimeStep: step! },
        });
        if (accepted.count !== 1) throw new TwoFactorConflict();
      } else {
        const accepted = await tx.twoFactorRecoveryCode.updateMany({
          where: { configurationId: configuration.id, codeHash: recoveryHash!, consumedAt: null },
          data: { consumedAt: now },
        });
        if (accepted.count !== 1) throw new TwoFactorConflict();
      }
      const consumed = await tx.twoFactorChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: challenge.maxAttempts }, sessionVersion: challenge.sessionVersion },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new TwoFactorConflict();
      await tx.user.update({ where: { id: account.id }, data: { lastSuccessfulLoginAt: now } });
      await recordSecurityEvent({ userId: account.id, type: 'TWO_FACTOR_CHALLENGE_COMPLETED', requestId: settings.requestId, category: input.factor }, tx);
      await recordSecurityEvent({ userId: account.id, type: input.factor === 'recovery' ? 'RECOVERY_CODE_LOGIN_SUCCEEDED' : 'LOGIN_SUCCEEDED', requestId: settings.requestId, category: input.factor }, tx);
      if (input.factor === 'recovery') await recordSecurityEvent({ userId: account.id, type: 'RECOVERY_CODE_CONSUMED', requestId: settings.requestId }, tx);
    });
  } catch (error) {
    if (error instanceof TwoFactorConflict) {
      await rejectChallengeAttempt(challenge.id, account.id, challenge.maxAttempts, input.factor, now, settings.requestId, settings.client);
      return null;
    }
    throw error;
  }
  return authorizedUser(account, challenge.sessionVersion);
}

export async function getTwoFactorStatus(userId: string, expectedSessionVersion: number, client: PrismaClient) {
  const configuration = await client.twoFactorConfiguration.findFirst({
    where: { userId, enabledAt: { not: null }, verifiedAt: { not: null }, user: { activo: true, authSessionVersion: { version: expectedSessionVersion } } },
    select: { id: true, enabledAt: true, _count: { select: { recoveryCodes: { where: { consumedAt: null } } } } },
  });
  return configuration ? { enabled: true, enabledAt: configuration.enabledAt, recoveryCodesRemaining: configuration._count.recoveryCodes } as const : { enabled: false, recoveryCodesRemaining: 0 } as const;
}

export async function regenerateTwoFactorRecoveryCodes(
  input: ManagementInput & { code: string },
  settings: Options & { recoveryCodeCount: number },
) {
  const now = settings.now ?? new Date();
  const account = await managementAccount(input, settings.client);
  const configuration = account?.twoFactorConfiguration;
  if (!account || !configuration?.enabledAt || !configuration.verifiedAt) return { status: 'invalid' } as const;
  let step: bigint | null = null;
  try { step = verifyTotp(decryptTotpSecret(configuration.secretEncrypted, settings.encryptionKey), input.code, now.getTime(), 1); } catch { /* invalid */ }
  if (step === null) return { status: 'invalid' } as const;
  const recoveryCodes = createRecoveryCodes(settings.recoveryCodeCount);
  const batchId = randomUUID();
  try {
    const sessionVersion = await settings.client.$transaction(async (tx) => {
      const accepted = await tx.twoFactorConfiguration.updateMany({ where: { id: configuration.id, OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: step! } }] }, data: { lastAcceptedTimeStep: step! } });
      if (accepted.count !== 1) throw new TwoFactorConflict();
      await tx.twoFactorRecoveryCode.updateMany({ where: { configurationId: configuration.id, consumedAt: null }, data: { consumedAt: now } });
      await tx.twoFactorRecoveryCode.createMany({ data: recoveryCodes.map((code) => ({ configurationId: configuration.id, batchId, codeHash: hashRecoveryCode(code) })) });
      const version = await tx.authSessionVersion.updateMany({ where: { userId: account.id, version: input.expectedSessionVersion }, data: { version: { increment: 1 } } });
      if (version.count !== 1) throw new TwoFactorConflict();
      await tx.twoFactorChallenge.updateMany({ where: { userId: account.id, consumedAt: null }, data: { consumedAt: now } });
      await revokeAllUserAuthSessions(account.id, 'RECOVERY_REGENERATED', now, tx);
      await recordSecurityEvent({ userId: account.id, type: 'RECOVERY_CODES_REGENERATED', requestId: settings.requestId }, tx);
      await recordSecurityEvent({ userId: account.id, type: 'SESSION_VERSION_INCREMENTED', requestId: settings.requestId }, tx);
      return input.expectedSessionVersion + 1;
    });
    const notification = await sendRecoveryCodesRegeneratedEmail(account.email, settings.emailAdapter);
    return { status: 'regenerated', recoveryCodes, sessionVersion, notificationSucceeded: notification.ok && notification.delivered } as const;
  } catch (error) {
    if (error instanceof TwoFactorConflict) return { status: 'invalid' } as const;
    throw error;
  }
}

export async function disableTwoFactor(
  input: ManagementInput & FactorInput,
  settings: Options,
) {
  const now = settings.now ?? new Date();
  const account = await managementAccount(input, settings.client);
  const configuration = account?.twoFactorConfiguration;
  if (!account || !configuration?.enabledAt || !configuration.verifiedAt) return { status: 'invalid' } as const;
  let step: bigint | null = null;
  const recoveryHash = input.factor === 'recovery' ? hashRecoveryCode(input.code) : null;
  if (input.factor === 'totp') {
    try { step = verifyTotp(decryptTotpSecret(configuration.secretEncrypted, settings.encryptionKey), input.code, now.getTime(), 1); } catch { /* invalid */ }
    if (step === null) return { status: 'invalid' } as const;
  }
  try {
    const sessionVersion = await settings.client.$transaction(async (tx) => {
      if (input.factor === 'totp') {
        const accepted = await tx.twoFactorConfiguration.updateMany({ where: { id: configuration.id, OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: step! } }] }, data: { lastAcceptedTimeStep: step! } });
        if (accepted.count !== 1) throw new TwoFactorConflict();
      } else {
        const accepted = await tx.twoFactorRecoveryCode.updateMany({ where: { configurationId: configuration.id, codeHash: recoveryHash!, consumedAt: null }, data: { consumedAt: now } });
        if (accepted.count !== 1) throw new TwoFactorConflict();
      }
      await tx.twoFactorChallenge.updateMany({ where: { userId: account.id, consumedAt: null }, data: { consumedAt: now } });
      await revokeAllUserAuthSessions(account.id, 'TWO_FACTOR_DISABLED', now, tx);
      const removed = await tx.twoFactorConfiguration.deleteMany({ where: { id: configuration.id, userId: account.id } });
      if (removed.count !== 1) throw new TwoFactorConflict();
      const version = await tx.authSessionVersion.updateMany({ where: { userId: account.id, version: input.expectedSessionVersion }, data: { version: { increment: 1 } } });
      if (version.count !== 1) throw new TwoFactorConflict();
      await recordSecurityEvent({ userId: account.id, type: 'TWO_FACTOR_DISABLED', requestId: settings.requestId, category: input.factor }, tx);
      await recordSecurityEvent({ userId: account.id, type: 'SESSION_VERSION_INCREMENTED', requestId: settings.requestId }, tx);
      return input.expectedSessionVersion + 1;
    });
    const notification = await sendTwoFactorDisabledEmail(account.email, settings.emailAdapter);
    return { status: 'disabled', sessionVersion, notificationSucceeded: notification.ok && notification.delivered } as const;
  } catch (error) {
    if (error instanceof TwoFactorConflict) return { status: 'invalid' } as const;
    throw error;
  }
}
