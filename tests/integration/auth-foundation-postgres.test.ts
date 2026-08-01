import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';

import { prisma } from '@/lib/prisma';
import { invalidateUserAuthenticationState, regenerateRecoveryCodesFoundation } from '@/server/auth-security/authentication-state-service';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findValidPasswordResetTokenByHash,
  invalidateOutstandingPasswordResetTokens,
} from '@/server/auth-security/password-reset-token-repository';
import {
  consumeRecoveryCodeByHash,
  countUnusedRecoveryCodes,
  createRecoveryCodeBatch,
  invalidateRecoveryCodeBatch,
  regenerateRecoveryCodeBatch,
} from '@/server/auth-security/recovery-code-repository';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import {
  ensureSessionVersion,
  getSessionVersion,
  incrementSessionVersion,
  matchesSessionVersion,
} from '@/server/auth-security/session-version-repository';
import {
  acceptTotpTimeStep,
  activateTotpConfiguration,
  createPendingTotpConfiguration,
  disableTotpConfiguration,
  getActiveTotpConfiguration,
  getPendingTotpConfiguration,
} from '@/server/auth-security/totp-configuration-repository';
import {
  consumeTwoFactorChallenge,
  createTwoFactorChallenge,
  findValidTwoFactorChallenge,
  incrementChallengeAttempts,
  invalidatePendingChallenges,
} from '@/server/auth-security/two-factor-challenge-repository';

const enabled = process.env.AUTH_FOUNDATION_DATABASE_URL !== undefined;
const fixtureUserIds: string[] = [];

after(async () => {
  if (enabled && fixtureUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
  }
  await prisma.$disconnect();
});

async function createFixtureUser(label: string) {
  const id = `phase6a-${label}-${randomUUID()}`;
  fixtureUserIds.push(id);
  return prisma.user.create({
    data: {
      id,
      nombre: 'Persona de Prueba',
      email: `${id}@example.invalid`,
      passwordHash: '$2b$12$123456789012345678901u12345678901234567890123456789012',
      activo: true,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
}

test('los repositorios Phase 6A preservan atomicidad y restricciones en PostgreSQL', { skip: !enabled, timeout: 60_000 }, async () => {
  const user = await createFixtureUser('repositories');
  const now = new Date();
  const future = new Date(now.getTime() + 60_000);
  const afterExpiry = new Date(future.getTime() + 1);

  assert.equal(await getSessionVersion(user.id), null, 'un usuario posterior a la migración se inicializa de forma explícita');
  assert.equal(await ensureSessionVersion(user.id), 0);
  assert.equal(await matchesSessionVersion(user.id, 0), true);
  assert.equal(await matchesSessionVersion(user.id, 1), false);
  const concurrentVersions = await Promise.all([
    incrementSessionVersion(user.id),
    incrementSessionVersion(user.id),
  ]);
  assert.deepEqual([...concurrentVersions].sort(), [1, 2]);
  assert.equal(await getSessionVersion(user.id), 2);
  assert.equal(await getSessionVersion('missing-user'), null);
  assert.equal(await incrementSessionVersion('missing-user'), null);

  await createPasswordResetToken({ userId: user.id, tokenHash: 'a'.repeat(64), expiresAt: future });
  assert.equal((await findValidPasswordResetTokenByHash('a'.repeat(64), now))?.userId, user.id);
  const resetResults = await Promise.all([
    consumePasswordResetToken('a'.repeat(64), now),
    consumePasswordResetToken('a'.repeat(64), now),
  ]);
  assert.deepEqual([...resetResults].sort(), [false, true]);
  assert.equal(await findValidPasswordResetTokenByHash('a'.repeat(64), now), null);
  await createPasswordResetToken({ userId: user.id, tokenHash: 'b'.repeat(64), expiresAt: future });
  await createPasswordResetToken({ userId: user.id, tokenHash: 'c'.repeat(64), expiresAt: future });
  assert.equal(await findValidPasswordResetTokenByHash('c'.repeat(64), afterExpiry), null);
  assert.equal(await invalidateOutstandingPasswordResetTokens(user.id, now), 2);

  const challenge = await createTwoFactorChallenge({
    userId: user.id,
    tokenHash: 'd'.repeat(64),
    expiresAt: future,
  });
  assert.equal((await findValidTwoFactorChallenge('d'.repeat(64), 'LOGIN', now))?.id, challenge.id);
  assert.equal(await incrementChallengeAttempts(challenge.id), true);
  const challengeResults = await Promise.all([
    consumeTwoFactorChallenge(challenge.id, now),
    consumeTwoFactorChallenge(challenge.id, now),
  ]);
  assert.deepEqual([...challengeResults].sort(), [false, true]);
  assert.equal(await consumeTwoFactorChallenge(challenge.id, now), false);
  const expiredChallenge = await createTwoFactorChallenge({ userId: user.id, tokenHash: 'e'.repeat(64), expiresAt: future });
  assert.equal(await findValidTwoFactorChallenge('e'.repeat(64), 'LOGIN', afterExpiry), null);
  assert.equal(await consumeTwoFactorChallenge(expiredChallenge.id, afterExpiry), false);
  const exhaustedChallenge = await createTwoFactorChallenge({ userId: user.id, tokenHash: '0'.repeat(64), expiresAt: future });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await incrementChallengeAttempts(exhaustedChallenge.id), true);
  }
  assert.equal(await incrementChallengeAttempts(exhaustedChallenge.id), false);
  assert.equal(await findValidTwoFactorChallenge('0'.repeat(64), 'LOGIN', now), null);
  const pendingChallenge = await createTwoFactorChallenge({ userId: user.id, tokenHash: 'f'.repeat(64), expiresAt: future });
  assert.equal(await invalidatePendingChallenges(user.id, now), 3);
  assert.equal(await consumeTwoFactorChallenge(pendingChallenge.id, now), false);

  const configuration = await createPendingTotpConfiguration({ userId: user.id, secretEncrypted: 'v1.fixture.fixture.fixture' });
  assert.equal((await getPendingTotpConfiguration(user.id))?.id, configuration.id);
  assert.equal(await getActiveTotpConfiguration(user.id), null);
  assert.equal(await activateTotpConfiguration(configuration.id, now), true);
  assert.equal((await getActiveTotpConfiguration(user.id))?.id, configuration.id);
  await assert.rejects(() => createPendingTotpConfiguration({ userId: user.id, secretEncrypted: 'v1.other.other.other' }));
  const stepResults = await Promise.all([
    acceptTotpTimeStep(configuration.id, BigInt(10)),
    acceptTotpTimeStep(configuration.id, BigInt(10)),
  ]);
  assert.deepEqual([...stepResults].sort(), [false, true]);
  assert.equal(await acceptTotpTimeStep(configuration.id, BigInt(9)), false);
  assert.equal(await acceptTotpTimeStep(configuration.id, BigInt(11)), true);

  assert.equal(await createRecoveryCodeBatch(configuration.id, 'batch-1', ['1'.repeat(64), '2'.repeat(64)]), 2);
  assert.equal(await countUnusedRecoveryCodes(configuration.id), 2);
  const recoveryResults = await Promise.all([
    consumeRecoveryCodeByHash(configuration.id, '1'.repeat(64), now),
    consumeRecoveryCodeByHash(configuration.id, '1'.repeat(64), now),
  ]);
  assert.deepEqual([...recoveryResults].sort(), [false, true]);
  assert.equal(await countUnusedRecoveryCodes(configuration.id), 1);
  assert.equal(await invalidateRecoveryCodeBatch(configuration.id, 'batch-1', now), 1);
  assert.equal(await regenerateRecoveryCodeBatch(configuration.id, 'batch-2', ['3'.repeat(64), '4'.repeat(64)], now), 2);
  assert.equal(await consumeRecoveryCodeByHash(configuration.id, '2'.repeat(64), now), false);
  assert.equal(await countUnusedRecoveryCodes(configuration.id), 2);
  assert.deepEqual(
    await regenerateRecoveryCodesFoundation({
      userId: user.id,
      configurationId: configuration.id,
      batchId: 'batch-3',
      codeHashes: ['5'.repeat(64), '6'.repeat(64)],
      now,
    }),
    { created: 2, sessionVersion: 3 },
  );
  assert.equal(await consumeRecoveryCodeByHash(configuration.id, '3'.repeat(64), now), false);

  await recordSecurityEvent({
    userId: user.id,
    type: 'RECOVERY_CODES_REGENERATED',
    metadata: { source: 'postgres-test', password: 'must-not-persist', nested: { Authorization: 'must-not-persist' } },
  });
  const storedEvent = await prisma.securityEvent.findFirstOrThrow({
    where: { userId: user.id, type: 'RECOVERY_CODES_REGENERATED' },
    orderBy: { createdAt: 'desc' },
  });
  assert.deepEqual(storedEvent.metadata, { source: 'postgres-test', nested: {} });

  assert.equal(await disableTotpConfiguration(user.id), true);
  assert.equal(await getActiveTotpConfiguration(user.id), null);
  assert.equal(await countUnusedRecoveryCodes(configuration.id), 0);
  assert.equal(await invalidateUserAuthenticationState(user.id), 4);
});
