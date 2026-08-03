import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { hash } from 'bcryptjs';

import { createOpaqueToken, hashAuthSecret } from '@/lib/auth-security';
import type { AuthEmailAdapter, AuthEmailMessage } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { acceptAccountInvitation, AdministrativePolicyError, createInmobiliariaWithAdministrator, inviteAgent, setManagedAccountActive } from '@/server/admin/admin-management-service';
import { promoteExistingGlobalAdmin } from '@/server/admin/global-admin-promotion';

const enabled = process.env.PHASE7_DATABASE_URL !== undefined;
const suffix = randomUUID();
const createdUserIds: string[] = [];

after(async () => {
  if (enabled && createdUserIds.length) {
    await prisma.accountInvitation.deleteMany({ where: { OR: [{ userId: { in: createdUserIds } }, { createdById: { in: createdUserIds } }] } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

function mailbox(messages: AuthEmailMessage[]): AuthEmailAdapter {
  return { async send(message) { messages.push(message); return { ok: true, delivered: true }; } };
}

function tokenFromMessage(message: AuthEmailMessage): string {
  const match = message.html.match(/[?&]token=([A-Za-z0-9_-]{43})/u);
  assert.ok(match?.[1]);
  return match[1];
}

async function makeUser(input: { role: 'ADMIN' | 'INMOBILIARIA' | 'AGENTE' | 'USUARIO_NORMAL'; label: string; tenantId?: string; active?: boolean }) {
  const user = await prisma.user.create({
    data: {
      nombre: `Persona ${input.label}`,
      email: `${input.label}-${suffix}@example.invalid`,
      passwordHash: await hash('Synthetic admin password', 4),
      rol: input.role,
      activo: input.active ?? true,
      emailVerifiedAt: new Date(),
      agenciaId: input.tenantId,
      authSessionVersion: { create: { version: 0 } },
    },
  });
  createdUserIds.push(user.id);
  return user;
}

test('Phase 7 enforces global creation, hash-only invitations and tenant-scoped agent authority', { skip: !enabled, timeout: 120_000 }, async () => {
  const messages: AuthEmailMessage[] = [];
  const adapter = mailbox(messages);
  const admin = await makeUser({ role: 'ADMIN', label: 'global-admin' });
  const tenantAOwner = await makeUser({ role: 'INMOBILIARIA', label: 'owner-a' });
  const tenantBOwner = await makeUser({ role: 'INMOBILIARIA', label: 'owner-b' });
  const tenantA = await prisma.inmobiliaria.create({ data: { userId: tenantAOwner.id, nombreAgencia: 'Tenant A Sintético', cuit: `A-${suffix}`, direccion: 'Calle A 100' } });
  const tenantB = await prisma.inmobiliaria.create({ data: { userId: tenantBOwner.id, nombreAgencia: 'Tenant B Sintético', cuit: `B-${suffix}`, direccion: 'Calle B 200' } });

  const createdTenant = await createInmobiliariaWithAdministrator({
    actorUserId: admin.id,
    nombreAgencia: 'Tenant Global Sintético',
    cuit: `G-${suffix}`,
    direccion: 'Calle Global 300',
    administrador: { nombre: 'Administradora Invitada', email: `invited-owner-${suffix}@example.invalid` },
  }, { client: prisma, emailAdapter: adapter });
  createdUserIds.push(createdTenant.value.administratorId);
  assert.equal(createdTenant.invitationDeliverySucceeded, true);
  const invitedAdministrator = await prisma.user.findUniqueOrThrow({ where: { id: createdTenant.value.administratorId }, include: { authSessionVersion: true, accountInvitations: true } });
  assert.equal(invitedAdministrator.rol, 'INMOBILIARIA');
  assert.equal(invitedAdministrator.activo, false);
  assert.equal(invitedAdministrator.accountInvitations.length, 1);
  assert.match(invitedAdministrator.accountInvitations[0]?.tokenHash ?? '', /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(JSON.stringify(invitedAdministrator), new RegExp(tokenFromMessage(messages[0] ?? { to: '', subject: '', html: '' }), 'u'));

  const agentResult = await inviteAgent({ actorUserId: tenantAOwner.id, inmobiliariaId: tenantA.id, nombre: 'Agente A2', email: `agent-a2-${suffix}@example.invalid` }, { client: prisma, emailAdapter: adapter });
  createdUserIds.push(agentResult.value.id);
  assert.equal(agentResult.value.rol, 'AGENTE');
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: agentResult.value.id } })).agenciaId, tenantA.id);
  const rawInvitation = tokenFromMessage(messages[1] ?? { to: '', subject: '', html: '' });
  assert.equal((await acceptAccountInvitation(rawInvitation, 'New synthetic agent password', { client: prisma })).status, 'accepted');
  assert.equal((await acceptAccountInvitation(rawInvitation, 'Another synthetic password', { client: prisma })).status, 'invalid');
  const activatedAgent = await prisma.user.findUniqueOrThrow({ where: { id: agentResult.value.id } });
  assert.equal(activatedAgent.activo, true);
  assert.ok(activatedAgent.emailVerifiedAt);

  await assert.rejects(
    inviteAgent({ actorUserId: tenantAOwner.id, inmobiliariaId: tenantB.id, nombre: 'Cross Tenant', email: `cross-${suffix}@example.invalid` }, { client: prisma, emailAdapter: adapter }),
    (error: unknown) => error instanceof AdministrativePolicyError && error.code === 'FORBIDDEN',
  );
  const agentA = await makeUser({ role: 'AGENTE', label: 'agent-a', tenantId: tenantA.id });
  await assert.rejects(
    inviteAgent({ actorUserId: agentA.id, inmobiliariaId: tenantA.id, nombre: 'Forbidden Agent', email: `forbidden-${suffix}@example.invalid` }, { client: prisma, emailAdapter: adapter }),
    (error: unknown) => error instanceof AdministrativePolicyError && error.code === 'FORBIDDEN',
  );

  const propertyA = await prisma.propiedad.create({ data: { inmobiliariaId: tenantA.id, agenteId: agentA.id, titulo: 'Propiedad A', descripcion: 'Descripción sintética de tenant A.', tipo: 'Casa', operacion: 'VENTA', precio: '100000.00', moneda: 'USD', direccion: 'Calle A 101', latitud: -37.32, longitud: -59.13, m2Total: 100, m2Cubiertos: 80, ambientes: 3, caracteristicas: [] } });
  const propertyB = await prisma.propiedad.create({ data: { inmobiliariaId: tenantB.id, titulo: 'Propiedad B', descripcion: 'Descripción sintética de tenant B.', tipo: 'Casa', operacion: 'VENTA', precio: '200000.00', moneda: 'USD', direccion: 'Calle B 201', latitud: -37.31, longitud: -59.12, m2Total: 120, m2Cubiertos: 90, ambientes: 4, caracteristicas: [] } });
  assert.deepEqual((await prisma.propiedad.findMany({ where: { inmobiliariaId: tenantA.id }, select: { id: true } })).map(({ id }) => id), [propertyA.id]);
  assert.equal(await prisma.propiedad.count({ where: { id: propertyB.id, inmobiliariaId: tenantA.id } }), 0);
});

test('Phase 7 account deactivation revokes authentication state but preserves 2FA and recovery data', { skip: !enabled, timeout: 120_000 }, async () => {
  const owner = await makeUser({ role: 'INMOBILIARIA', label: 'status-owner' });
  const tenant = await prisma.inmobiliaria.create({ data: { userId: owner.id, nombreAgencia: 'Tenant Status', cuit: `S-${suffix}`, direccion: 'Calle Status 1' } });
  const agent = await makeUser({ role: 'AGENTE', label: 'status-agent', tenantId: tenant.id });
  const configuration = await prisma.twoFactorConfiguration.create({ data: { userId: agent.id, secretEncrypted: 'v1.synthetic.authenticated.payload', enabledAt: new Date(), verifiedAt: new Date(), recoveryCodes: { create: { codeHash: hashAuthSecret(createOpaqueToken()), batchId: 'synthetic-batch' } } } });
  const sessionRaw = createOpaqueToken();
  await prisma.authSession.create({ data: { userId: agent.id, sessionHash: hashAuthSecret(sessionRaw), sessionVersion: 0, browser: 'QA', operatingSystem: 'QA', expiresAt: new Date(Date.now() + 86_400_000) } });
  const result = await setManagedAccountActive({ actorUserId: owner.id, targetUserId: agent.id, activo: false }, { client: prisma });
  assert.equal(result.changed, true);
  const after = await prisma.user.findUniqueOrThrow({ where: { id: agent.id }, include: { authSessionVersion: true, authSessions: true, twoFactorConfiguration: { include: { recoveryCodes: true } } } });
  assert.equal(after.activo, false);
  assert.equal(after.authSessionVersion?.version, 1);
  assert.ok(after.authSessions[0]?.revokedAt);
  assert.equal(after.twoFactorConfiguration?.id, configuration.id);
  assert.equal(after.twoFactorConfiguration?.recoveryCodes.length, 1);
});

test('Phase 7 operational promotion is transactional, revokes sessions, and is idempotent', { skip: !enabled, timeout: 120_000 }, async () => {
  const account = await makeUser({ role: 'USUARIO_NORMAL', label: 'promotable' });
  await prisma.authSession.create({ data: { userId: account.id, sessionHash: hashAuthSecret(createOpaqueToken()), sessionVersion: 0, browser: 'QA', operatingSystem: 'QA', expiresAt: new Date(Date.now() + 86_400_000) } });
  const promoted = await promoteExistingGlobalAdmin(account.email, prisma);
  assert.equal(promoted.status, 'promoted');
  assert.equal(promoted.version, 1);
  assert.equal(promoted.revokedSessions, 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).rol, 'ADMIN');
  assert.equal((await promoteExistingGlobalAdmin(account.email, prisma)).status, 'already_admin');
  await assert.rejects(promoteExistingGlobalAdmin(`missing-${suffix}@example.invalid`, prisma), /No existe/u);
});
