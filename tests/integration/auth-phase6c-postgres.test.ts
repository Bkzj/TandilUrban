import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';

import { compare, hash } from 'bcryptjs';

import { authorizeCredentials } from '@/lib/auth-credentials';
import { hashAuthSecret } from '@/lib/auth-security';
import { type AuthEmailAdapter, type AuthEmailMessage } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { loadCurrentAuthenticationState } from '@/server/auth/current-authentication-state';
import {
  changeAuthenticatedPassword,
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/server/auth/password-service';

const enabled = process.env.PHASE6C_DATABASE_URL !== undefined;
const suffix = randomUUID();
const createdUserIds: string[] = [];

after(async () => {
  if (enabled && createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

function memoryEmailAdapter(messages: AuthEmailMessage[]): AuthEmailAdapter {
  return { async send(message) { messages.push(message); return { ok: true, delivered: true }; } };
}

function resetTokenFrom(message: AuthEmailMessage): string {
  const match = message.html.match(/token=([A-Za-z0-9_-]{43})/u);
  assert.ok(match?.[1]);
  return match[1];
}

function findCredentialsUser(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      authSessionVersion: true,
      twoFactorConfiguration: { select: { enabledAt: true, verifiedAt: true } },
      inmobiliariaPerfil: { select: { id: true } },
    },
  });
}

test('Phase 6C restablece una sola vez, invalida sesiones y preserva identidad y segundo factor', { skip: !enabled, timeout: 120_000 }, async () => {
  const now = new Date();
  const oldPassword = 'Synthetic old password 6C';
  const newPassword = 'Synthetic new password 6C';
  const owner = await prisma.user.create({
    data: {
      nombre: 'Titular Ficticio 6C',
      email: `owner-${suffix}@example.invalid`,
      passwordHash: await hash('Synthetic owner password', 4),
      rol: 'INMOBILIARIA',
      activo: true,
      emailVerifiedAt: now,
      authSessionVersion: { create: {} },
    },
  });
  createdUserIds.push(owner.id);
  const tenant = await prisma.inmobiliaria.create({
    data: {
      userId: owner.id,
      nombreAgencia: 'Agencia Ficticia 6C',
      cuit: `30-${suffix.replaceAll('-', '').slice(0, 8)}-7`,
      direccion: 'Calle Ficticia 600',
    },
  });
  const user = await prisma.user.create({
    data: {
      nombre: 'Agente Ficticio 6C',
      email: `agent-${suffix}@example.invalid`,
      passwordHash: await hash(oldPassword, 4),
      rol: 'AGENTE',
      agenciaId: tenant.id,
      activo: true,
      emailVerifiedAt: now,
      authSessionVersion: { create: { version: 7 } },
      twoFactorConfiguration: {
        create: {
          secretEncrypted: 'v1.synthetic-iv.synthetic-tag.synthetic-ciphertext',
          enabledAt: now,
          verifiedAt: now,
          recoveryCodes: {
            create: [
              { codeHash: hashAuthSecret(`recovery-a-${suffix}`), batchId: `batch-${suffix}` },
              { codeHash: hashAuthSecret(`recovery-b-${suffix}`), batchId: `batch-${suffix}` },
            ],
          },
        },
      },
      twoFactorChallenges: {
        create: { tokenHash: hashAuthSecret(`challenge-${suffix}`), expiresAt: new Date(now.getTime() + 60_000) },
      },
    },
    include: { twoFactorConfiguration: { include: { recoveryCodes: true } } },
  });
  createdUserIds.push(user.id);

  const oldSession = await loadCurrentAuthenticationState(user.id, 7);
  assert.equal(oldSession?.tenantId, tenant.id);
  const originalTotp = user.twoFactorConfiguration;
  assert.ok(originalTotp);
  const originalCodes = originalTotp.recoveryCodes.map((code) => ({ id: code.id, hash: code.codeHash }));

  const messages: AuthEmailMessage[] = [];
  const request = await requestPasswordReset(user.email.toUpperCase(), {
    client: prisma,
    emailAdapter: memoryEmailAdapter(messages),
    ttlMinutes: 45,
    now,
  });
  assert.deepEqual(request, { eligible: true, deliverySucceeded: true });
  const rawToken = resetTokenFrom(messages[0]!);
  const persisted = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id, consumedAt: null } });
  assert.equal(persisted.tokenHash, hashAuthSecret(rawToken));
  assert.equal(persisted.tokenHash.includes(rawToken), false);

  const results = await Promise.all([
    resetPasswordWithToken(rawToken, newPassword, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now: new Date(now.getTime() + 1_000) }),
    resetPasswordWithToken(rawToken, newPassword, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now: new Date(now.getTime() + 1_000) }),
  ]);
  assert.equal(results.filter((result) => result.status === 'changed').length, 1);
  assert.equal(results.filter((result) => result.status === 'invalid').length, 1);

  const afterReset = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      authSessionVersion: true,
      twoFactorConfiguration: { include: { recoveryCodes: { orderBy: { id: 'asc' } } } },
      twoFactorChallenges: true,
      securityEvents: true,
    },
  });
  assert.equal(await compare(oldPassword, afterReset.passwordHash), false);
  assert.equal(await compare(newPassword, afterReset.passwordHash), true);
  assert.equal(afterReset.authSessionVersion?.version, 8);
  assert.equal(await loadCurrentAuthenticationState(user.id, 7), null);
  assert.equal((await loadCurrentAuthenticationState(user.id, 8))?.tenantId, tenant.id);
  assert.equal(afterReset.rol, 'AGENTE');
  assert.equal(afterReset.agenciaId, tenant.id);
  assert.equal(afterReset.activo, true);
  assert.ok(afterReset.emailVerifiedAt);
  assert.equal(afterReset.twoFactorConfiguration?.enabledAt?.getTime(), originalTotp.enabledAt?.getTime());
  assert.equal(afterReset.twoFactorConfiguration?.secretEncrypted, originalTotp.secretEncrypted);
  assert.deepEqual(
    afterReset.twoFactorConfiguration?.recoveryCodes.map((code) => ({ id: code.id, hash: code.codeHash })),
    originalCodes.sort((a, b) => a.id.localeCompare(b.id)),
  );
  assert.ok(afterReset.twoFactorChallenges.every((challenge) => challenge.consumedAt !== null));
  assert.equal(afterReset.securityEvents.filter((event) => event.type === 'PASSWORD_RESET_COMPLETED').length, 1);
  assert.equal(messages.filter((message) => message.subject === 'Tu contraseña fue modificada').length, 1);

  const authorizedOld = await authorizeCredentials({ email: user.email, password: oldPassword }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 8; },
  });
  const authorizedNew = await authorizeCredentials({ email: user.email, password: newPassword }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 8; },
  });
  assert.equal(authorizedOld, null);
  assert.equal(authorizedNew, null, 'el usuario con TOTP queda fail-closed hasta Phase 6D');
});

test('Phase 6C cambia contraseña autenticada, invalida estado previo y resuelve concurrencia optimista', { skip: !enabled, timeout: 120_000 }, async () => {
  const now = new Date();
  const currentPassword = 'Current password 6C';
  const nextPassword = 'Next password 6C';
  const alternatePassword = 'Alternate password 6C';
  const email = `normal-${suffix}@example.invalid`;
  const user = await prisma.user.create({
    data: {
      nombre: 'Persona Normal Ficticia',
      email,
      passwordHash: await hash(currentPassword, 4),
      rol: 'USUARIO_NORMAL',
      activo: true,
      emailVerifiedAt: now,
      authSessionVersion: { create: { version: 3 } },
      passwordResetTokens: {
        create: { tokenHash: hashAuthSecret(`old-reset-${suffix}`), expiresAt: new Date(now.getTime() + 60_000) },
      },
      twoFactorChallenges: {
        create: { tokenHash: hashAuthSecret(`old-challenge-${suffix}`), expiresAt: new Date(now.getTime() + 60_000) },
      },
    },
  });
  createdUserIds.push(user.id);

  assert.equal((await changeAuthenticatedPassword({ userId: user.id, expectedSessionVersion: 3, currentPassword: 'wrong password', newPassword: nextPassword }, { client: prisma, now })).status, 'invalid_current_password');
  assert.equal((await changeAuthenticatedPassword({ userId: user.id, expectedSessionVersion: 3, currentPassword, newPassword: currentPassword }, { client: prisma, now })).status, 'same_password');

  const messages: AuthEmailMessage[] = [];
  const results = await Promise.all([
    changeAuthenticatedPassword({ userId: user.id, expectedSessionVersion: 3, currentPassword, newPassword: nextPassword }, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now: new Date(now.getTime() + 1_000) }),
    changeAuthenticatedPassword({ userId: user.id, expectedSessionVersion: 3, currentPassword, newPassword: alternatePassword }, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now: new Date(now.getTime() + 1_000) }),
  ]);
  assert.equal(results.filter((result) => result.status === 'changed').length, 1);
  assert.equal(results.filter((result) => result.status === 'invalid_session').length, 1);

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { authSessionVersion: true, passwordResetTokens: true, twoFactorChallenges: true, securityEvents: true },
  });
  assert.equal(updated.authSessionVersion?.version, 4);
  assert.equal(await compare(currentPassword, updated.passwordHash), false);
  assert.equal((await compare(nextPassword, updated.passwordHash)) || (await compare(alternatePassword, updated.passwordHash)), true);
  assert.ok(updated.passwordChangedAt);
  assert.ok(updated.passwordResetTokens.every((token) => token.consumedAt !== null));
  assert.ok(updated.twoFactorChallenges.every((challenge) => challenge.consumedAt !== null));
  assert.equal(updated.securityEvents.filter((event) => event.type === 'PASSWORD_CHANGED').length, 1);
  assert.equal(await loadCurrentAuthenticationState(user.id, 3), null);
  assert.ok(await loadCurrentAuthenticationState(user.id, 4));
  assert.equal(messages.filter((message) => message.subject === 'Tu contraseña fue modificada').length, 1);

  const winningPassword = (await compare(nextPassword, updated.passwordHash)) ? nextPassword : alternatePassword;
  const login = await authorizeCredentials({ email, password: winningPassword }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 4; },
  });
  assert.equal(login?.sessionVersion, 4);
  assert.equal(login?.role, 'USUARIO_NORMAL');
});

test('Phase 6C no emite tokens para cuentas desconocidas, inactivas o no verificadas', { skip: !enabled, timeout: 60_000 }, async () => {
  const now = new Date();
  const inactive = await prisma.user.create({ data: { nombre: 'Inactiva Ficticia', email: `inactive-${suffix}@example.invalid`, passwordHash: await hash('Inactive password 6C', 4), activo: false, emailVerifiedAt: now } });
  const unverified = await prisma.user.create({ data: { nombre: 'No Verificada Ficticia', email: `unverified-${suffix}@example.invalid`, passwordHash: await hash('Unverified password 6C', 4), activo: true } });
  createdUserIds.push(inactive.id, unverified.id);
  const messages: AuthEmailMessage[] = [];
  for (const email of [inactive.email, unverified.email, `unknown-${suffix}@example.invalid`]) {
    assert.deepEqual(await requestPasswordReset(email, { client: prisma, emailAdapter: memoryEmailAdapter(messages), ttlMinutes: 45, now }), { eligible: false, deliverySucceeded: false });
  }
  assert.equal(messages.length, 0);
  assert.equal(await prisma.passwordResetToken.count({ where: { userId: { in: [inactive.id, unverified.id] } } }), 0);
});
