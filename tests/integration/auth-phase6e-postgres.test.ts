import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { hash } from 'bcryptjs';

import { createOpaqueToken, hashAuthSecret, totpAt } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import type { AuthEmailAdapter } from '@/lib/mail';
import {
  cleanupAuthSessions,
  createAuthSession,
  findActiveAuthSessionByHash,
  revokeCurrentAuthSessionByHash,
} from '@/server/auth-security/auth-session-repository';
import { loadCurrentSessionAuthenticationState } from '@/server/auth/current-authentication-state';
import {
  getUserActiveSessions,
  revokeOtherUserSession,
  revokeUserSessionsBulk,
} from '@/server/auth/session-management-service';
import { changeAuthenticatedPassword, resetPasswordWithToken } from '@/server/auth/password-service';
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateTwoFactorRecoveryCodes,
  startTwoFactorSetup,
} from '@/server/auth/two-factor-service';

const enabled = process.env.PHASE6E_DATABASE_URL !== undefined;
const suffix = randomUUID();
const userIds: string[] = [];

after(async () => {
  if (enabled && userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function makeUser(label: string, password: string, now: Date) {
  const user = await prisma.user.create({
    data: {
      nombre: `Persona ${label}`,
      email: `${label}-${suffix}@example.invalid`,
      passwordHash: await hash(password, 4),
      activo: true,
      emailVerifiedAt: now,
      authSessionVersion: { create: {} },
    },
  });
  userIds.push(user.id);
  return user;
}

async function makeSession(userId: string, sessionVersion: number, now: Date, browser: string) {
  const raw = createOpaqueToken();
  const row = await createAuthSession({
    userId,
    sessionHash: hashAuthSecret(raw),
    sessionVersion,
    browser,
    operatingSystem: 'QA OS',
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 86_400_000),
  }, prisma);
  return { raw, row };
}

test('Phase 6E creates, identifies, throttles and individually revokes sessions without cross-user impact', { skip: !enabled, timeout: 120_000 }, async () => {
  const now = new Date('2026-08-04T12:00:00.000Z');
  const password = 'Synthetic session password';
  const user = await makeUser('session-owner', password, now);
  const other = await makeUser('session-other', password, now);
  const current = await makeSession(user.id, 0, now, 'Chrome');
  const target = await makeSession(user.id, 0, new Date(now.getTime() + 1_000), 'Safari');
  const untouched = await makeSession(other.id, 0, now, 'Firefox');

  const insideThrottle = await loadCurrentSessionAuthenticationState(user.id, 0, current.raw, new Date(now.getTime() + 5 * 60_000));
  assert.equal(insideThrottle?.authSessionId, current.row.id);
  assert.equal((await prisma.authSession.findUniqueOrThrow({ where: { id: current.row.id } })).lastSeenAt.getTime(), now.getTime());
  await loadCurrentSessionAuthenticationState(user.id, 0, current.raw, new Date(now.getTime() + 11 * 60_000));
  assert.equal((await prisma.authSession.findUniqueOrThrow({ where: { id: current.row.id } })).lastSeenAt.getTime(), now.getTime() + 11 * 60_000);

  const listed = await getUserActiveSessions({ userId: user.id, sessionVersion: 0, currentSessionId: current.row.id, now: new Date(now.getTime() + 12 * 60_000) }, prisma);
  assert.equal(listed[0]?.current, true);
  assert.equal(listed.length, 2);

  const concurrent = await Promise.all([
    revokeOtherUserSession({ userId: user.id, currentSessionId: current.row.id, targetSessionId: target.row.id, now }, prisma),
    revokeOtherUserSession({ userId: user.id, currentSessionId: current.row.id, targetSessionId: target.row.id, now }, prisma),
  ]);
  assert.equal(concurrent.filter((result) => result === 'revoked').length, 1);
  assert.equal(concurrent.filter((result) => result === 'unavailable').length, 1);
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: target.row.id } })).revokedAt);
  assert.equal(await revokeOtherUserSession({ userId: user.id, currentSessionId: current.row.id, targetSessionId: untouched.row.id, now }, prisma), 'unavailable');
  assert.equal((await prisma.authSession.findUniqueOrThrow({ where: { id: untouched.row.id } })).revokedAt, null);
  assert.ok(await findActiveAuthSessionByHash(user.id, hashAuthSecret(current.raw), 0, new Date(now.getTime() + 12 * 60_000), prisma));
});

test('Phase 6E bulk revocation preserves current or closes all with immediate version invalidation', { skip: !enabled, timeout: 120_000 }, async () => {
  const now = new Date('2026-08-04T14:00:00.000Z');
  const password = 'Synthetic bulk session password';
  const user = await makeUser('bulk-owner', password, now);
  const current = await makeSession(user.id, 0, now, 'Chrome');
  const second = await makeSession(user.id, 0, new Date(now.getTime() + 1_000), 'Safari');
  const third = await makeSession(user.id, 0, new Date(now.getTime() + 2_000), 'Firefox');

  const others = await revokeUserSessionsBulk({ userId: user.id, currentSessionId: current.row.id, expectedSessionVersion: 0, password }, { client: prisma, encryptionKey: '', includeCurrent: false, now });
  assert.equal(others.status, 'revoked');
  assert.ok(await findActiveAuthSessionByHash(user.id, hashAuthSecret(current.raw), 0, new Date(now.getTime() + 10_000), prisma));
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: second.row.id } })).revokedAt);
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: third.row.id } })).revokedAt);

  const completedAfter = await makeSession(user.id, 0, new Date(now.getTime() + 20_000), 'Edge');
  assert.ok(await findActiveAuthSessionByHash(user.id, hashAuthSecret(completedAfter.raw), 0, new Date(now.getTime() + 21_000), prisma));
  const all = await revokeUserSessionsBulk({ userId: user.id, currentSessionId: current.row.id, expectedSessionVersion: 0, password }, { client: prisma, encryptionKey: '', includeCurrent: true, now: new Date(now.getTime() + 30_000) });
  assert.equal(all.status, 'revoked');
  assert.equal((await prisma.authSessionVersion.findUniqueOrThrow({ where: { userId: user.id } })).version, 1);
  assert.equal(await loadCurrentSessionAuthenticationState(user.id, 0, current.raw, new Date(now.getTime() + 31_000)), null);
  assert.equal(await loadCurrentSessionAuthenticationState(user.id, 0, completedAfter.raw, new Date(now.getTime() + 31_000)), null);

  const logoutUser = await makeUser('logout-owner', password, now);
  const logoutSession = await makeSession(logoutUser.id, 0, now, 'Chrome');
  const logoutRace = await Promise.all([
    revokeCurrentAuthSessionByHash(logoutUser.id, hashAuthSecret(logoutSession.raw), now, prisma),
    revokeCurrentAuthSessionByHash(logoutUser.id, hashAuthSecret(logoutSession.raw), now, prisma),
  ]);
  assert.equal(logoutRace.filter(Boolean).length, 1);
  assert.equal(await loadCurrentSessionAuthenticationState(logoutUser.id, 0, logoutSession.raw, new Date(now.getTime() + 1_000)), null);
});

test('Phase 6E enforces constraints, deactivation, version mismatch and cleanup retention', { skip: !enabled, timeout: 120_000 }, async () => {
  const now = new Date('2026-08-04T16:00:00.000Z');
  const password = 'Synthetic cleanup password';
  const user = await makeUser('cleanup-owner', password, now);
  const active = await makeSession(user.id, 0, now, 'Chrome');
  await prisma.user.update({ where: { id: user.id }, data: { rol: 'ADMIN' } });
  assert.equal((await loadCurrentSessionAuthenticationState(user.id, 0, active.raw, new Date(now.getTime() + 1_000)))?.user.rol, 'ADMIN');
  await prisma.authSessionVersion.update({ where: { userId: user.id }, data: { version: 1 } });
  assert.equal(await loadCurrentSessionAuthenticationState(user.id, 0, active.raw, new Date(now.getTime() + 2_000)), null);
  await prisma.user.update({ where: { id: user.id }, data: { activo: false } });
  assert.equal(await loadCurrentSessionAuthenticationState(user.id, 1, active.raw, new Date(now.getTime() + 3_000)), null);

  const oldUser = await makeUser('old-session-owner', password, new Date('2025-01-01T00:00:00.000Z'));
  const raw = createOpaqueToken();
  await prisma.authSession.create({ data: {
    userId: oldUser.id, sessionHash: hashAuthSecret(raw), sessionVersion: 0, browser: 'Chrome', operatingSystem: 'QA OS',
    issuedAt: new Date('2025-01-01T00:00:00.000Z'), lastSeenAt: new Date('2025-01-01T00:00:00.000Z'), expiresAt: new Date('2025-01-02T00:00:00.000Z'),
  } });
  assert.deepEqual(await cleanupAuthSessions({ now, retentionDays: 30, apply: false }, prisma), { candidates: 1, deleted: 0 });
  assert.deepEqual(await cleanupAuthSessions({ now, retentionDays: 30, apply: true }, prisma), { candidates: 1, deleted: 1 });
});

test('Phase 6E records are revoked by password and two-factor security changes', { skip: !enabled, timeout: 180_000 }, async () => {
  const now = new Date('2026-08-04T18:00:00.000Z');
  const oldPassword = 'Synthetic global invalidation password';
  const emailAdapter: AuthEmailAdapter = { async send() { return { ok: true, delivered: true }; } };
  const passwordUser = await makeUser('password-invalidation', oldPassword, now);
  const passwordSession = await makeSession(passwordUser.id, 0, now, 'Chrome');
  const changed = await changeAuthenticatedPassword({ userId: passwordUser.id, expectedSessionVersion: 0, currentPassword: oldPassword, newPassword: 'Synthetic changed password' }, { client: prisma, now, emailAdapter });
  assert.equal(changed.status, 'changed');
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: passwordSession.row.id } })).revokedAt);

  const resetUser = await makeUser('reset-invalidation', oldPassword, now);
  const resetSession = await makeSession(resetUser.id, 0, now, 'Safari');
  const rawReset = createOpaqueToken();
  await prisma.passwordResetToken.create({ data: { userId: resetUser.id, tokenHash: hashAuthSecret(rawReset), expiresAt: new Date(now.getTime() + 30 * 60_000) } });
  const reset = await resetPasswordWithToken(rawReset, 'Synthetic reset password', { client: prisma, now, emailAdapter });
  assert.equal(reset.status, 'changed');
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: resetSession.row.id } })).revokedAt);

  const encryptionKey = Buffer.alloc(32, 41).toString('base64');
  const twoFactorUser = await makeUser('two-factor-invalidation', oldPassword, now);
  const preActivation = await makeSession(twoFactorUser.id, 0, now, 'Firefox');
  const setup = await startTwoFactorSetup({ userId: twoFactorUser.id, expectedSessionVersion: 0, password: oldPassword }, { client: prisma, encryptionKey, issuer: 'Propea QA', setupTtlSeconds: 300, now });
  assert.equal(setup.status, 'pending');
  if (setup.status !== 'pending') return;
  const secret = setup.manualKey.replaceAll(' ', '');
  const activation = await confirmTwoFactorSetup({ userId: twoFactorUser.id, expectedSessionVersion: 0, code: totpAt(secret, BigInt(Math.floor(now.getTime() / 30_000))) }, { client: prisma, encryptionKey, setupTtlSeconds: 300, recoveryCodeCount: 6, now, emailAdapter });
  assert.equal(activation.status, 'enabled');
  if (activation.status !== 'enabled') return;
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: preActivation.row.id } })).revokedAt);

  const beforeRegeneration = await makeSession(twoFactorUser.id, 1, new Date(now.getTime() + 30_000), 'Chrome');
  const otherTwoFactorSession = await makeSession(twoFactorUser.id, 1, new Date(now.getTime() + 31_000), 'Safari');
  const missingFactor = await revokeUserSessionsBulk({ userId: twoFactorUser.id, currentSessionId: beforeRegeneration.row.id, expectedSessionVersion: 1, password: oldPassword }, { client: prisma, encryptionKey, includeCurrent: false, now: new Date(now.getTime() + 30_000) });
  assert.equal(missingFactor.status, 'second_factor_required');
  const closedOther = await revokeUserSessionsBulk({ userId: twoFactorUser.id, currentSessionId: beforeRegeneration.row.id, expectedSessionVersion: 1, password: oldPassword, factor: 'totp', code: totpAt(secret, BigInt(Math.floor((now.getTime() + 30_000) / 30_000))) }, { client: prisma, encryptionKey, includeCurrent: false, now: new Date(now.getTime() + 30_000) });
  assert.equal(closedOther.status, 'revoked');
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: otherTwoFactorSession.row.id } })).revokedAt);
  assert.equal((await prisma.authSession.findUniqueOrThrow({ where: { id: beforeRegeneration.row.id } })).revokedAt, null);

  const regeneration = await regenerateTwoFactorRecoveryCodes({ userId: twoFactorUser.id, expectedSessionVersion: 1, password: oldPassword, code: totpAt(secret, BigInt(Math.floor((now.getTime() + 60_000) / 30_000))) }, { client: prisma, encryptionKey, recoveryCodeCount: 6, now: new Date(now.getTime() + 60_000), emailAdapter });
  assert.equal(regeneration.status, 'regenerated');
  if (regeneration.status !== 'regenerated') return;
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: beforeRegeneration.row.id } })).revokedAt);

  const beforeDisable = await makeSession(twoFactorUser.id, 2, new Date(now.getTime() + 90_000), 'Safari');
  const disabled = await disableTwoFactor({ userId: twoFactorUser.id, expectedSessionVersion: 2, password: oldPassword, factor: 'recovery', code: regeneration.recoveryCodes[0]! }, { client: prisma, encryptionKey, now: new Date(now.getTime() + 90_000), emailAdapter });
  assert.equal(disabled.status, 'disabled');
  assert.ok((await prisma.authSession.findUniqueOrThrow({ where: { id: beforeDisable.row.id } })).revokedAt);
});
