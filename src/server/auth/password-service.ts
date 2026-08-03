import { compare, hash } from 'bcryptjs';
import { type PrismaClient } from '@/generated/prisma';

import { createOpaqueToken, hashAuthSecret } from '@/lib/auth-security';
import {
  type AuthEmailAdapter,
  sendPasswordChangedEmail,
  sendAccountPasswordResetEmail,
} from '@/lib/mail';
import {
  createPasswordResetToken,
  findValidPasswordResetTokenByHash,
  invalidateOutstandingPasswordResetTokens,
} from '@/server/auth-security/password-reset-token-repository';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import { invalidatePendingChallenges } from '@/server/auth-security/two-factor-challenge-repository';
import { revokeAllUserAuthSessions } from '@/server/auth-security/auth-session-repository';

export const GENERIC_PASSWORD_RESET_REQUEST_MESSAGE =
  'Si existe una cuenta asociada a ese correo, te enviaremos un enlace para restablecer la contraseña.';

const BCRYPT_COST = 12;

type PasswordServiceOptions = {
  client: PrismaClient;
  emailAdapter?: AuthEmailAdapter;
  requestId?: string;
  now?: Date;
};

export async function requestPasswordReset(
  email: string,
  options: PasswordServiceOptions & { ttlMinutes: number },
): Promise<{ eligible: boolean; deliverySucceeded: boolean }> {
  const now = options.now ?? new Date();
  const normalizedEmail = email.normalize('NFKC').trim().toLowerCase();
  const issued = createOpaqueToken();
  const tokenHash = hashAuthSecret(issued);
  const expiresAt = new Date(now.getTime() + options.ttlMinutes * 60_000);
  const account = await options.client.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    select: { id: true, email: true, activo: true, emailVerifiedAt: true },
  });
  if (!account?.activo || account.emailVerifiedAt === null) {
    return { eligible: false, deliverySucceeded: false };
  }

  await options.client.$transaction(async (tx) => {
    const invalidated = await invalidateOutstandingPasswordResetTokens(account.id, now, tx);
    await createPasswordResetToken({ userId: account.id, tokenHash, expiresAt }, tx);
    await recordSecurityEvent(
      { userId: account.id, type: 'PASSWORD_RESET_REQUESTED', requestId: options.requestId },
      tx,
    );
    await recordSecurityEvent(
      { userId: account.id, type: 'PASSWORD_RESET_TOKEN_CREATED', requestId: options.requestId },
      tx,
    );
    if (invalidated > 0) {
      await recordSecurityEvent(
        { userId: account.id, type: 'PASSWORD_RESET_TOKENS_INVALIDATED', requestId: options.requestId },
        tx,
      );
    }
  });

  const delivery = options.emailAdapter
    ? await sendAccountPasswordResetEmail(account.email, issued, options.ttlMinutes, options.emailAdapter)
    : await sendAccountPasswordResetEmail(account.email, issued, options.ttlMinutes);
  return { eligible: true, deliverySucceeded: delivery.ok && delivery.delivered };
}

export type ResetPasswordResult =
  | { status: 'changed'; sessionVersion: number; notificationSucceeded: boolean }
  | { status: 'invalid' }
  | { status: 'same_password' };

class PasswordResetStateConflict extends Error {}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
  options: PasswordServiceOptions,
): Promise<ResetPasswordResult> {
  const now = options.now ?? new Date();
  const tokenHash = hashAuthSecret(rawToken);
  const token = await findValidPasswordResetTokenByHash(tokenHash, now, options.client);
  if (!token) return { status: 'invalid' };
  const account = await options.client.user.findUnique({
    where: { id: token.userId },
    select: { id: true, email: true, passwordHash: true, activo: true },
  });
  if (!account?.activo) return { status: 'invalid' };
  if (await compare(newPassword, account.passwordHash)) return { status: 'same_password' };
  const passwordHash = await hash(newPassword, BCRYPT_COST);

  let changed: { email: string; sessionVersion: number };
  try {
    changed = await options.client.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, userId: account.id, tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new PasswordResetStateConflict();

      const updated = await tx.user.updateMany({
        where: { id: account.id, activo: true, passwordHash: account.passwordHash },
        data: { passwordHash, passwordChangedAt: now },
      });
      if (updated.count !== 1) throw new PasswordResetStateConflict();

      const invalidatedTokens = await invalidateOutstandingPasswordResetTokens(account.id, now, tx);
      const invalidatedChallenges = await invalidatePendingChallenges(account.id, now, tx);
      await revokeAllUserAuthSessions(account.id, 'PASSWORD_RESET', now, tx);
      const version = await tx.authSessionVersion.upsert({
        where: { userId: account.id },
        create: { userId: account.id, version: 1 },
        update: { version: { increment: 1 } },
        select: { version: true },
      });
      await recordSecurityEvent(
        { userId: account.id, type: 'PASSWORD_RESET_TOKEN_CONSUMED', requestId: options.requestId },
        tx,
      );
      await recordSecurityEvent(
        { userId: account.id, type: 'PASSWORD_RESET_COMPLETED', requestId: options.requestId },
        tx,
      );
      if (invalidatedTokens > 0) {
        await recordSecurityEvent(
          { userId: account.id, type: 'PASSWORD_RESET_TOKENS_INVALIDATED', requestId: options.requestId },
          tx,
        );
      }
      if (invalidatedChallenges > 0) {
        await recordSecurityEvent(
          { userId: account.id, type: 'TWO_FACTOR_CHALLENGE_INVALIDATED', requestId: options.requestId },
          tx,
        );
      }
      await recordSecurityEvent(
        { userId: account.id, type: 'SESSION_VERSION_INCREMENTED', requestId: options.requestId },
        tx,
      );
      return { email: account.email, sessionVersion: version.version };
    });
  } catch (error) {
    if (error instanceof PasswordResetStateConflict) return { status: 'invalid' };
    throw error;
  }

  const notification = options.emailAdapter
    ? await sendPasswordChangedEmail(changed.email, options.emailAdapter)
    : await sendPasswordChangedEmail(changed.email);
  return {
    status: 'changed',
    sessionVersion: changed.sessionVersion,
    notificationSucceeded: notification.ok && notification.delivered,
  };
}

export type ChangePasswordResult =
  | { status: 'changed'; sessionVersion: number; notificationSucceeded: boolean }
  | { status: 'invalid_session' }
  | { status: 'invalid_current_password' }
  | { status: 'same_password' };

class PasswordChangeStateConflict extends Error {}

export async function changeAuthenticatedPassword(
  input: {
    userId: string;
    expectedSessionVersion: number;
    currentPassword: string;
    newPassword: string;
  },
  options: PasswordServiceOptions,
): Promise<ChangePasswordResult> {
  const now = options.now ?? new Date();
  const account = await options.client.user.findUnique({
    where: { id: input.userId },
    include: { authSessionVersion: true },
  });
  if (
    !account?.activo ||
    !account.authSessionVersion ||
    account.authSessionVersion.version !== input.expectedSessionVersion
  ) {
    return { status: 'invalid_session' };
  }
  if (!(await compare(input.currentPassword, account.passwordHash))) {
    await recordSecurityEvent({
      userId: account.id,
      type: 'PASSWORD_CHANGE_FAILED',
      requestId: options.requestId,
      category: 'invalid_current_password',
    }, options.client);
    return { status: 'invalid_current_password' };
  }
  if (await compare(input.newPassword, account.passwordHash)) {
    await recordSecurityEvent({
      userId: account.id,
      type: 'PASSWORD_CHANGE_FAILED',
      requestId: options.requestId,
      category: 'password_reuse',
    }, options.client);
    return { status: 'same_password' };
  }
  const passwordHash = await hash(input.newPassword, BCRYPT_COST);

  let changed: { email: string; sessionVersion: number };
  try {
    changed = await options.client.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: account.id, activo: true, passwordHash: account.passwordHash },
        data: { passwordHash, passwordChangedAt: now },
      });
      if (updated.count !== 1) throw new PasswordChangeStateConflict();

      const version = await tx.authSessionVersion.updateMany({
        where: { userId: account.id, version: input.expectedSessionVersion },
        data: { version: { increment: 1 } },
      });
      if (version.count !== 1) throw new PasswordChangeStateConflict();
      const invalidatedTokens = await invalidateOutstandingPasswordResetTokens(account.id, now, tx);
      const invalidatedChallenges = await invalidatePendingChallenges(account.id, now, tx);
      await revokeAllUserAuthSessions(account.id, 'PASSWORD_CHANGED', now, tx);
      await recordSecurityEvent(
        { userId: account.id, type: 'PASSWORD_CHANGED', requestId: options.requestId, category: 'authenticated' },
        tx,
      );
      await recordSecurityEvent(
        { userId: account.id, type: 'SESSION_VERSION_INCREMENTED', requestId: options.requestId },
        tx,
      );
      if (invalidatedTokens > 0) {
        await recordSecurityEvent(
          { userId: account.id, type: 'PASSWORD_RESET_TOKENS_INVALIDATED', requestId: options.requestId },
          tx,
        );
      }
      if (invalidatedChallenges > 0) {
        await recordSecurityEvent(
          { userId: account.id, type: 'TWO_FACTOR_CHALLENGE_INVALIDATED', requestId: options.requestId },
          tx,
        );
      }
      return { email: account.email, sessionVersion: input.expectedSessionVersion + 1 };
    });
  } catch (error) {
    if (error instanceof PasswordChangeStateConflict) return { status: 'invalid_session' };
    throw error;
  }

  const notification = options.emailAdapter
    ? await sendPasswordChangedEmail(changed.email, options.emailAdapter)
    : await sendPasswordChangedEmail(changed.email);
  return {
    status: 'changed',
    sessionVersion: changed.sessionVersion,
    notificationSucceeded: notification.ok && notification.delivered,
  };
}
