import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';

import { hash } from 'bcryptjs';

import { hashRecoveryCode, totpAt } from '@/lib/auth-security';
import { type AuthEmailAdapter, type AuthEmailMessage } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { loadCurrentAuthenticationState } from '@/server/auth/current-authentication-state';
import {
  beginTwoFactorLogin,
  completeTwoFactorLogin,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateTwoFactorRecoveryCodes,
  startTwoFactorSetup,
} from '@/server/auth/two-factor-service';

const enabled = process.env.PHASE6D_DATABASE_URL !== undefined;
const encryptionKey = Buffer.alloc(32, 29).toString('base64');
const suffix = randomUUID();
const users: string[] = [];

after(async () => {
  if (enabled && users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

function mailbox(messages: AuthEmailMessage[]): AuthEmailAdapter {
  return { async send(message) { messages.push(message); return { ok: true, delivered: true }; } };
}

test('Phase 6D setup, TOTP/recovery concurrency, regeneration and disablement are atomic', { skip: !enabled, timeout: 180_000 }, async () => {
  const password = 'Synthetic 6D current password';
  const base = new Date('2026-08-03T12:00:00.000Z');
  const user = await prisma.user.create({
    data: {
      nombre: 'Persona Ficticia 6D', email: `phase6d-${suffix}@example.invalid`, passwordHash: await hash(password, 4),
      activo: true, emailVerifiedAt: base, rol: 'USUARIO_NORMAL', authSessionVersion: { create: {} },
    },
  });
  users.push(user.id);
  const messages: AuthEmailMessage[] = [];

  assert.equal((await startTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, password: 'wrong password' }, { client: prisma, encryptionKey, issuer: 'Propea Group', setupTtlSeconds: 300, now: base })).status, 'invalid');
  const setup = await startTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, password }, { client: prisma, encryptionKey, issuer: 'Propea Group', setupTtlSeconds: 300, now: base });
  assert.equal(setup.status, 'pending');
  if (setup.status !== 'pending') return;
  const secret = setup.manualKey.replaceAll(' ', '');
  assert.match(setup.provisioningUri, /^otpauth:\/\/totp\//u);
  assert.match(setup.qrDataUrl, /^data:image\/png;base64,/u);
  const storedPending = await prisma.twoFactorConfiguration.findUniqueOrThrow({ where: { userId: user.id } });
  assert.notEqual(storedPending.secretEncrypted, secret);
  assert.equal(JSON.stringify(storedPending).includes(secret), false);
  assert.equal(storedPending.enabledAt, null);

  const activationCode = totpAt(secret, BigInt(Math.floor(base.getTime() / 30_000)));
  const activations = await Promise.all([
    confirmTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, code: activationCode }, { client: prisma, encryptionKey, setupTtlSeconds: 300, recoveryCodeCount: 10, now: base, emailAdapter: mailbox(messages) }),
    confirmTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, code: activationCode }, { client: prisma, encryptionKey, setupTtlSeconds: 300, recoveryCodeCount: 10, now: base, emailAdapter: mailbox(messages) }),
  ]);
  assert.equal(activations.filter((result) => result.status === 'enabled').length, 1);
  const enabledResult = activations.find((result) => result.status === 'enabled');
  assert.ok(enabledResult && enabledResult.status === 'enabled');
  assert.equal(enabledResult.recoveryCodes.length, 10);
  const configuration = await prisma.twoFactorConfiguration.findUniqueOrThrow({ where: { userId: user.id }, include: { recoveryCodes: true } });
  assert.ok(configuration.enabledAt);
  assert.equal(configuration.recoveryCodes.length, 10);
  assert.ok(configuration.recoveryCodes.every((row) => !enabledResult.recoveryCodes.includes(row.codeHash)));
  assert.equal(new Set(configuration.recoveryCodes.map((row) => row.batchId)).size, 1);
  assert.equal((await getTwoFactorStatus(user.id, 1, prisma)).recoveryCodesRemaining, 10);
  assert.equal(await loadCurrentAuthenticationState(user.id, 0), null);

  const primary = await beginTwoFactorLogin({ email: user.email, password }, { client: prisma, challengeTtlSeconds: 300, now: new Date(base.getTime() + 30_000) });
  assert.equal(primary.status, 'challenge');
  if (primary.status !== 'challenge') return;
  const challengeRow = await prisma.twoFactorChallenge.findUniqueOrThrow({ where: { tokenHash: (await import('@/lib/auth-security')).hashAuthSecret(primary.challengeToken) } });
  assert.equal(challengeRow.sessionVersion, 1);
  assert.equal(JSON.stringify(challengeRow).includes(primary.challengeToken), false);
  const loginCode = totpAt(secret, BigInt(Math.floor((base.getTime() + 30_000) / 30_000)));
  const totpLogins = await Promise.all([
    completeTwoFactorLogin({ challengeToken: primary.challengeToken, factor: 'totp', code: loginCode }, { client: prisma, encryptionKey, now: new Date(base.getTime() + 30_000) }),
    completeTwoFactorLogin({ challengeToken: primary.challengeToken, factor: 'totp', code: loginCode }, { client: prisma, encryptionKey, now: new Date(base.getTime() + 30_000) }),
  ]);
  assert.equal(totpLogins.filter(Boolean).length, 1);
  assert.equal(await prisma.securityEvent.count({ where: { userId: user.id, type: 'TWO_FACTOR_CHALLENGE_COMPLETED' } }), 1);

  const recoveryCode = enabledResult.recoveryCodes[0]!;
  const recoveryPrimary = await beginTwoFactorLogin({ email: user.email, password }, { client: prisma, challengeTtlSeconds: 300, now: new Date(base.getTime() + 60_000) });
  assert.equal(recoveryPrimary.status, 'challenge');
  if (recoveryPrimary.status !== 'challenge') return;
  const recoveryLogins = await Promise.all([
    completeTwoFactorLogin({ challengeToken: recoveryPrimary.challengeToken, factor: 'recovery', code: recoveryCode }, { client: prisma, encryptionKey, now: new Date(base.getTime() + 60_000) }),
    completeTwoFactorLogin({ challengeToken: recoveryPrimary.challengeToken, factor: 'recovery', code: recoveryCode }, { client: prisma, encryptionKey, now: new Date(base.getTime() + 60_000) }),
  ]);
  assert.equal(recoveryLogins.filter(Boolean).length, 1);
  assert.ok((await prisma.twoFactorRecoveryCode.findUniqueOrThrow({ where: { codeHash: hashRecoveryCode(recoveryCode) } })).consumedAt);
  assert.equal(await prisma.securityEvent.count({ where: { userId: user.id, type: 'RECOVERY_CODE_LOGIN_SUCCEEDED' } }), 1);

  const regenerateAt = new Date(base.getTime() + 90_000);
  const regenerateCode = totpAt(secret, BigInt(Math.floor(regenerateAt.getTime() / 30_000)));
  const regenerations = await Promise.all([
    regenerateTwoFactorRecoveryCodes({ userId: user.id, expectedSessionVersion: 1, password, code: regenerateCode }, { client: prisma, encryptionKey, recoveryCodeCount: 10, now: regenerateAt, emailAdapter: mailbox(messages) }),
    regenerateTwoFactorRecoveryCodes({ userId: user.id, expectedSessionVersion: 1, password, code: regenerateCode }, { client: prisma, encryptionKey, recoveryCodeCount: 10, now: regenerateAt, emailAdapter: mailbox(messages) }),
  ]);
  assert.equal(regenerations.filter((result) => result.status === 'regenerated').length, 1);
  const regenerated = regenerations.find((result) => result.status === 'regenerated');
  assert.ok(regenerated && regenerated.status === 'regenerated');
  assert.equal(await prisma.twoFactorRecoveryCode.count({ where: { configurationId: configuration.id, consumedAt: null } }), 10);
  assert.equal(new Set((await prisma.twoFactorRecoveryCode.findMany({ where: { configurationId: configuration.id, consumedAt: null } })).map((row) => row.batchId)).size, 1);
  assert.equal(await loadCurrentAuthenticationState(user.id, 1), null);

  const disabled = await disableTwoFactor({ userId: user.id, expectedSessionVersion: 2, password, factor: 'recovery', code: regenerated.recoveryCodes[0]! }, { client: prisma, encryptionKey, now: new Date(base.getTime() + 120_000), emailAdapter: mailbox(messages) });
  assert.equal(disabled.status, 'disabled');
  assert.equal(await prisma.twoFactorConfiguration.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.twoFactorRecoveryCode.count({ where: { configurationId: configuration.id } }), 0);
  assert.equal((await prisma.authSessionVersion.findUniqueOrThrow({ where: { userId: user.id } })).version, 3);
  assert.equal((await beginTwoFactorLogin({ email: user.email, password }, { client: prisma, challengeTtlSeconds: 300, now: new Date(base.getTime() + 150_000) })).status, 'normal');
  assert.deepEqual(messages.map((message) => message.subject).sort(), ['Códigos de recuperación regenerados', 'Verificación en dos pasos activada', 'Verificación en dos pasos desactivada'].sort());
});

test('Phase 6D rejects expired, exhausted, disabled and stale-version challenges', { skip: !enabled, timeout: 90_000 }, async () => {
  const now = new Date('2026-08-03T14:00:00.000Z');
  const password = 'Synthetic stale password';
  const user = await prisma.user.create({ data: { nombre: 'Stale 6D', email: `stale-${suffix}@example.invalid`, passwordHash: await hash(password, 4), activo: true, emailVerifiedAt: now, authSessionVersion: { create: {} } } });
  users.push(user.id);
  const setup = await startTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, password }, { client: prisma, encryptionKey, issuer: 'Propea Group', setupTtlSeconds: 300, now });
  assert.equal(setup.status, 'pending'); if (setup.status !== 'pending') return;
  const secret = setup.manualKey.replaceAll(' ', '');
  await confirmTwoFactorSetup({ userId: user.id, expectedSessionVersion: 0, code: totpAt(secret, BigInt(Math.floor(now.getTime() / 30_000))) }, { client: prisma, encryptionKey, setupTtlSeconds: 300, recoveryCodeCount: 6, now });
  const challenge = await beginTwoFactorLogin({ email: user.email, password }, { client: prisma, challengeTtlSeconds: 60, now: new Date(now.getTime() + 30_000) });
  assert.equal(challenge.status, 'challenge'); if (challenge.status !== 'challenge') return;
  const challengeHash = (await import('@/lib/auth-security')).hashAuthSecret(challenge.challengeToken);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await completeTwoFactorLogin({ challengeToken: challenge.challengeToken, factor: 'totp', code: '000000' }, { client: prisma, encryptionKey, now: new Date(now.getTime() + 30_000) }), null);
  }
  const exhausted = await prisma.twoFactorChallenge.findUniqueOrThrow({ where: { tokenHash: challengeHash } });
  assert.equal(exhausted.attempts, exhausted.maxAttempts);
  assert.ok(exhausted.consumedAt);
  assert.equal(await completeTwoFactorLogin({ challengeToken: challenge.challengeToken, factor: 'totp', code: '000000' }, { client: prisma, encryptionKey, now: new Date(now.getTime() + 30_000) }), null);

  const staleChallenge = await beginTwoFactorLogin({ email: user.email, password }, { client: prisma, challengeTtlSeconds: 60, now: new Date(now.getTime() + 30_000) });
  assert.equal(staleChallenge.status, 'challenge'); if (staleChallenge.status !== 'challenge') return;
  await prisma.authSessionVersion.update({ where: { userId: user.id }, data: { version: { increment: 1 } } });
  assert.equal(await completeTwoFactorLogin({ challengeToken: staleChallenge.challengeToken, factor: 'totp', code: totpAt(secret, BigInt(Math.floor((now.getTime() + 30_000) / 30_000))) }, { client: prisma, encryptionKey, now: new Date(now.getTime() + 30_000) }), null);
  await prisma.user.update({ where: { id: user.id }, data: { activo: false } });
  assert.equal(await completeTwoFactorLogin({ challengeToken: staleChallenge.challengeToken, factor: 'recovery', code: 'AAAAA-BBBBB' }, { client: prisma, encryptionKey, now: new Date(now.getTime() + 31_000) }), null);
});
