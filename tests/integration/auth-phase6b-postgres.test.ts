import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';

import { compare, hash } from 'bcryptjs';

import { authorizeCredentials } from '@/lib/auth-credentials';
import { hashVerificationToken } from '@/lib/auth-verification';
import { type AuthEmailAdapter, type AuthEmailMessage } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { incrementSessionVersion } from '@/server/auth-security/session-version-repository';
import { loadCurrentAuthenticationState } from '@/server/auth/current-authentication-state';
import { registerPublicAccount } from '@/server/auth/registration-service';
import { resendAccountVerification, verifyEmailToken } from '@/server/auth/verification-service';

const enabled = process.env.PHASE6B_DATABASE_URL !== undefined;
const suffix = randomUUID();
const emails: string[] = [];

after(async () => {
  if (enabled && emails.length > 0) await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

function memoryEmailAdapter(messages: AuthEmailMessage[]): AuthEmailAdapter {
  return {
    async send(message) {
      messages.push(message);
      return { ok: true, delivered: true };
    },
  };
}

function rawTokenFrom(message: AuthEmailMessage): string {
  const match = message.html.match(/token=([A-Za-z0-9_-]{43})/u);
  assert.ok(match?.[1], 'el adaptador fake debe recibir el token raw sólo dentro del enlace');
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

test('Phase 6B completa registro, verificación, login y frescura de sesión en PostgreSQL', { skip: !enabled, timeout: 90_000 }, async () => {
  const messages: AuthEmailMessage[] = [];
  const email = `person-${suffix}@example.invalid`;
  const disabledEmail = `disabled-${suffix}@example.invalid`;
  const deliveryFailureEmail = `delivery-${suffix}@example.invalid`;
  const totpEmail = `totp-${suffix}@example.invalid`;
  const ownerAEmail = `owner-a-${suffix}@example.invalid`;
  const ownerBEmail = `owner-b-${suffix}@example.invalid`;
  const legacyLoginEmail = `legacy-login-${suffix}@example.invalid`;
  emails.push(email, disabledEmail, deliveryFailureEmail, totpEmail, ownerAEmail, ownerBEmail, legacyLoginEmail);
  const password = '  Exact Password 123  ';
  const now = new Date();

  const concurrentRegistration = await Promise.all([
    registerPublicAccount({ nombre: 'Persona Ficticia', email, password }, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now }),
    registerPublicAccount({ nombre: 'Persona Ficticia', email: email.toUpperCase(), password }, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now }),
  ]);
  assert.equal(concurrentRegistration.filter((result) => result.accountCreated).length, 1);
  assert.equal(await prisma.user.count({ where: { email: { equals: email, mode: 'insensitive' } } }), 1);
  const account = await prisma.user.findFirstOrThrow({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { authSessionVersion: true, verificationTokens: true, securityEvents: true },
  });
  assert.equal(account.rol, 'USUARIO_NORMAL');
  assert.equal(account.agenciaId, null);
  assert.equal(account.emailVerifiedAt, null);
  assert.equal(account.authSessionVersion?.version, 0);
  assert.equal(await compare(password, account.passwordHash), true);
  assert.equal(await compare(password.trim(), account.passwordHash), false);
  assert.equal(account.passwordHash.includes(password), false);
  assert.equal(account.verificationTokens.length, 1);
  assert.match(account.verificationTokens[0]!.token, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    new Set(account.securityEvents.map((event) => event.type)),
    new Set(['REGISTRATION', 'SESSION_VERSION_INITIALIZED', 'VERIFICATION_REQUESTED']),
  );

  const rawToken = rawTokenFrom(messages[0]!);
  assert.equal(account.verificationTokens[0]!.token, hashVerificationToken(rawToken));
  assert.equal(account.verificationTokens[0]!.token.includes(rawToken), false);
  assert.equal(await authorizeCredentials({ email, password }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 0; },
  }), null, 'la cuenta no verificada no debe iniciar sesión');
  const verificationResults = await Promise.all([
    verifyEmailToken(rawToken, { client: prisma, now }),
    verifyEmailToken(rawToken, { client: prisma, now }),
  ]);
  assert.equal(verificationResults.filter((result) => result.status === 'verified').length, 1);
  assert.equal((await verifyEmailToken(rawToken, { client: prisma, now })).status, 'invalid');
  assert.equal((await verifyEmailToken('x'.repeat(43), { client: prisma, now })).status, 'invalid');
  assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).emailVerifiedAt);

  const authorized = await authorizeCredentials({ email: email.toUpperCase(), password }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion(userId) {
      return (await prisma.authSessionVersion.upsert({ where: { userId }, create: { userId }, update: {} })).version;
    },
  });
  assert.equal(authorized?.sessionVersion, 0);
  assert.equal(authorized?.role, 'USUARIO_NORMAL');
  assert.equal(await authorizeCredentials({ email, password: `${password}incorrecta` }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 0; },
  }), null);
  assert.equal(await authorizeCredentials({ email: `unknown-${suffix}@example.invalid`, password }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 0; },
  }), null);
  assert.equal(await loadCurrentAuthenticationState(account.id, 0).then((state) => state?.user.rol), 'USUARIO_NORMAL');

  const ownerPasswordHash = await hash('Synthetic owner password', 4);
  const ownerA = await prisma.user.create({ data: { nombre: 'Titular A', email: ownerAEmail, passwordHash: ownerPasswordHash, rol: 'INMOBILIARIA', activo: true, emailVerifiedAt: now, authSessionVersion: { create: {} } } });
  const ownerB = await prisma.user.create({ data: { nombre: 'Titular B', email: ownerBEmail, passwordHash: ownerPasswordHash, rol: 'INMOBILIARIA', activo: true, emailVerifiedAt: now, authSessionVersion: { create: {} } } });
  const tenantA = await prisma.inmobiliaria.create({ data: { userId: ownerA.id, nombreAgencia: 'Tenant A', cuit: `30-${suffix.slice(0, 8)}-1`, direccion: 'Calle Ficticia 100' } });
  const tenantB = await prisma.inmobiliaria.create({ data: { userId: ownerB.id, nombreAgencia: 'Tenant B', cuit: `30-${suffix.slice(9, 17)}-2`, direccion: 'Calle Ficticia 200' } });
  await prisma.user.update({ where: { id: account.id }, data: { rol: 'AGENTE', agenciaId: tenantA.id } });
  assert.equal((await loadCurrentAuthenticationState(account.id, 0))?.tenantId, tenantA.id);
  await prisma.user.update({ where: { id: account.id }, data: { agenciaId: tenantB.id } });
  assert.equal((await loadCurrentAuthenticationState(account.id, 0))?.tenantId, tenantB.id);
  await prisma.user.update({ where: { id: account.id }, data: { agenciaId: null } });
  assert.equal((await loadCurrentAuthenticationState(account.id, 0))?.tenantId, null);
  assert.equal(await incrementSessionVersion(account.id), 1);
  assert.equal(await loadCurrentAuthenticationState(account.id, 0), null);
  assert.equal((await loadCurrentAuthenticationState(account.id, 1))?.user.rol, 'AGENTE');
  await prisma.user.update({ where: { id: account.id }, data: { activo: false } });
  assert.equal(await loadCurrentAuthenticationState(account.id, 1), null);

  await prisma.user.create({
    data: {
      nombre: 'Cuenta Legacy Verificada',
      email: legacyLoginEmail,
      passwordHash: ownerPasswordHash,
      activo: true,
      emailVerifiedAt: now,
    },
  });
  assert.equal(await prisma.authSessionVersion.count({ where: { user: { email: legacyLoginEmail } } }), 0);
  const legacyAuthorized = await authorizeCredentials(
    { email: legacyLoginEmail, password: 'Synthetic owner password' },
    {
      findUser: findCredentialsUser,
      async ensureSessionVersion(userId) {
        return (await prisma.authSessionVersion.upsert({ where: { userId }, create: { userId }, update: {} })).version;
      },
    },
  );
  assert.equal(legacyAuthorized?.sessionVersion, 0);
  assert.equal(await prisma.authSessionVersion.count({ where: { userId: legacyAuthorized?.id } }), 1);

  await prisma.user.create({ data: { nombre: 'Cuenta Deshabilitada', email: disabledEmail, passwordHash: ownerPasswordHash, activo: false, emailVerifiedAt: null } });
  const disabledUser = await prisma.user.findUniqueOrThrow({ where: { email: disabledEmail } });
  const disabledRawToken = 'D'.repeat(43);
  await prisma.verificationToken.create({ data: { userId: disabledUser.id, email: disabledEmail, token: hashVerificationToken(disabledRawToken), createdAt: new Date(now.getTime() - 60_000), expiresAt: new Date(now.getTime() + 60_000) } });
  assert.equal((await verifyEmailToken(disabledRawToken, { client: prisma, now })).status, 'invalid');
  const disabledResend = await resendAccountVerification(disabledEmail, { client: prisma, emailAdapter: memoryEmailAdapter(messages), now });
  assert.deepEqual(disabledResend, { eligible: false, deliverySucceeded: false });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: disabledEmail } })).activo, false);

  const failingDelivery = await registerPublicAccount(
    { nombre: 'Entrega Fallida', email: deliveryFailureEmail, password: 'Safe Password 123' },
    { client: prisma, emailAdapter: { async send() { return { ok: false, error: new Error('synthetic') }; } }, now },
  );
  assert.equal(failingDelivery.accountCreated, true);
  assert.equal(failingDelivery.deliverySucceeded, false);
  assert.equal(await prisma.user.count({ where: { email: deliveryFailureEmail } }), 1);

  const deliveryUser = await prisma.user.findUniqueOrThrow({ where: { email: deliveryFailureEmail } });
  const expiredRawToken = 'E'.repeat(43);
  await prisma.verificationToken.create({ data: { userId: deliveryUser.id, email: deliveryFailureEmail, token: hashVerificationToken(expiredRawToken), createdAt: new Date(now.getTime() - 120_000), expiresAt: new Date(now.getTime() - 60_000) } });
  assert.equal((await verifyEmailToken(expiredRawToken, { client: prisma, now })).status, 'invalid');
  const oldToken = await prisma.verificationToken.findFirstOrThrow({ where: { userId: deliveryUser.id } });
  const resendMessages: AuthEmailMessage[] = [];
  const resent = await resendAccountVerification(deliveryFailureEmail, { client: prisma, emailAdapter: memoryEmailAdapter(resendMessages), now: new Date(now.getTime() + 1_000) });
  assert.deepEqual(resent, { eligible: true, deliverySucceeded: true });
  assert.ok((await prisma.verificationToken.findUniqueOrThrow({ where: { id: oldToken.id } })).invalidatedAt);
  assert.equal(await prisma.verificationToken.count({ where: { userId: deliveryUser.id, invalidatedAt: null } }), 1);

  const totpUser = await prisma.user.create({ data: { nombre: 'Cuenta TOTP', email: totpEmail, passwordHash: ownerPasswordHash, activo: true, emailVerifiedAt: now, authSessionVersion: { create: {} }, twoFactorConfiguration: { create: { secretEncrypted: 'v1.fixture.fixture.fixture', enabledAt: now, verifiedAt: now } } } });
  assert.equal(await authorizeCredentials({ email: totpEmail, password: 'Synthetic owner password' }, {
    findUser: findCredentialsUser,
    async ensureSessionVersion() { return 0; },
  }), null);
  assert.equal(await prisma.user.count({ where: { id: totpUser.id } }), 1);
});
