import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { hash } from 'bcryptjs';

import type { AuthEmailAdapter, AuthEmailMessage } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { acceptAccountInvitation, AdministrativePolicyError, createInmobiliariaWithAdministrator, resendAccountInvitation } from '@/server/admin/admin-management-service';
import type { InvitationCopyContext, InvitationCopyProvider } from '@/server/admin/invitation-copy';

const enabled = process.env.PHASE7B_DATABASE_URL !== undefined;
const suffix = randomUUID();

after(async () => prisma.$disconnect());

function mailbox(messages: AuthEmailMessage[], delivered = true): AuthEmailAdapter {
  return { async send(message) { messages.push(message); return delivered ? { ok: true, delivered: true } : { ok: false, error: new Error('synthetic email failure') }; } };
}

function rawToken(message: AuthEmailMessage): string {
  const match = message.html.match(/[?&]token=([A-Za-z0-9_-]{43})/u);
  assert.ok(match?.[1]);
  return match[1];
}

function validCopyProvider(calls: InvitationCopyContext[]): InvitationCopyProvider {
  return { async generate(context) { calls.push(context); return { subject: 'Invitación de Propea Group', greeting: `Hola, ${context.administratorDisplayName.split(' ')[0]}.`, intro: `Te invitamos a administrar ${context.inmobiliariaName}.`, roleSummary: 'Podrás gestionar publicaciones y agentes.', closing: 'Configurá tu cuenta para comenzar.' }; } };
}

async function createUser(role: 'ADMIN' | 'USUARIO_NORMAL' | 'AGENTE', label: string, tenantId?: string) {
  return prisma.user.create({ data: { nombre: `Persona ${label}`, email: `${label}-${suffix}@example.invalid`, passwordHash: await hash('Synthetic Phase7B password', 4), rol: role, activo: true, emailVerifiedAt: new Date(), agenciaId: tenantId, authSessionVersion: { create: { version: 0 } } } });
}

test('Phase 7B atomically creates tenant, forced administrator, hash-only invitation and branded delivery', { skip: !enabled, timeout: 120_000 }, async () => {
  const admin = await createUser('ADMIN', 'admin-create');
  const messages: AuthEmailMessage[] = [];
  const copyCalls: InvitationCopyContext[] = [];
  const result = await createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Estudio Inmobiliario Sintético', cuit: `C-${suffix}`, direccion: 'Calle Sintética 100', administrador: { nombre: 'Juana Sintética', email: `owner-created-${suffix}@example.invalid` } }, { client: prisma, emailAdapter: mailbox(messages), copyProvider: validCopyProvider(copyCalls) });
  const tenant = await prisma.inmobiliaria.findUniqueOrThrow({ where: { id: result.value.inmobiliariaId }, include: { user: { include: { authSessionVersion: true } }, accountInvitations: true } });
  assert.equal(tenant.user.rol, 'INMOBILIARIA');
  assert.equal(tenant.user.activo, false);
  assert.equal(tenant.user.authSessionVersion?.version, 0);
  assert.equal(tenant.accountInvitations.length, 1);
  assert.equal(tenant.accountInvitations[0]?.deliveryStatus, 'SENT');
  assert.match(tenant.accountInvitations[0]?.tokenHash ?? '', /^[a-f0-9]{64}$/u);
  assert.equal(messages.length, 1);
  assert.match(messages[0]?.html ?? '', /PROPEA GROUP/u);
  assert.match(messages[0]?.text ?? '', /Configurar mi cuenta/u);
  assert.deepEqual(Object.keys(copyCalls[0] ?? {}).sort(), ['administratorDisplayName', 'inmobiliariaName', 'role']);
  assert.doesNotMatch(JSON.stringify(copyCalls), /token|url|password|email/iu);
  assert.equal(await prisma.securityEvent.count({ where: { targetUserId: tenant.user.id, type: { in: ['ACCOUNT_INVITATION_CREATED', 'ACCOUNT_INVITATION_SENT'] } } }), 2);
});

test('Phase 7B provider/email failures stay outside creation transaction and resend invalidates the first link', { skip: !enabled, timeout: 120_000 }, async () => {
  const admin = await createUser('ADMIN', 'admin-failure');
  const failedMessages: AuthEmailMessage[] = [];
  const throwingProvider: InvitationCopyProvider = { async generate() { throw new Error('synthetic Gemini failure'); } };
  const result = await createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Fallback Inmobiliaria', cuit: `F-${suffix}`, direccion: 'Calle Fallback 200', administrador: { nombre: 'Fallback Persona', email: `owner-fallback-${suffix}@example.invalid` } }, { client: prisma, emailAdapter: mailbox(failedMessages, false), copyProvider: throwingProvider });
  assert.equal(result.invitationCopySource, 'fallback');
  assert.equal(result.invitationDeliverySucceeded, false);
  const first = rawToken(failedMessages[0] as AuthEmailMessage);
  assert.equal((await prisma.accountInvitation.findUniqueOrThrow({ where: { id: result.value.invitationId } })).deliveryStatus, 'FAILED');
  const resentMessages: AuthEmailMessage[] = [];
  const resent = await resendAccountInvitation({ actorUserId: admin.id, inmobiliariaId: result.value.inmobiliariaId }, { client: prisma, emailAdapter: mailbox(resentMessages), copyProvider: throwingProvider });
  assert.equal(resent.invitationDeliverySucceeded, true);
  const second = rawToken(resentMessages[0] as AuthEmailMessage);
  assert.notEqual(first, second);
  assert.equal((await acceptAccountInvitation(first, 'Synthetic invited password', { client: prisma })).status, 'invalid');
  const outcomes = await Promise.all([acceptAccountInvitation(second, 'Synthetic invited password', { client: prisma }), acceptAccountInvitation(second, 'Synthetic invited password', { client: prisma })]);
  assert.deepEqual(outcomes.map(({ status }) => status).sort(), ['accepted', 'invalid']);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: result.value.administratorId } })).rol, 'INMOBILIARIA');
});

test('Phase 7B requires explicit confirmation for an existing normal account and rejects assigned roles', { skip: !enabled, timeout: 120_000 }, async () => {
  const admin = await createUser('ADMIN', 'admin-existing');
  const normal = await createUser('USUARIO_NORMAL', 'existing-normal');
  await assert.rejects(createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Existing Normal Tenant', cuit: `E-${suffix}`, direccion: 'Calle Existing 10', administrador: { nombre: normal.nombre, email: normal.email } }, { client: prisma, emailAdapter: mailbox([]) }), (error: unknown) => error instanceof AdministrativePolicyError && error.reason === 'CONFIRM_EXISTING_ACCOUNT');
  assert.equal(await prisma.inmobiliaria.count({ where: { cuit: `E-${suffix}` } }), 0);
  const messages: AuthEmailMessage[] = [];
  const linked = await createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Existing Normal Tenant', cuit: `E-${suffix}`, direccion: 'Calle Existing 10', administrador: { nombre: normal.nombre, email: normal.email }, confirmExistingAccount: true }, { client: prisma, emailAdapter: mailbox(messages) });
  assert.equal(linked.value.administratorId, normal.id);
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: normal.id }, include: { authSessionVersion: true } });
  assert.equal(updated.rol, 'INMOBILIARIA');
  assert.equal(updated.activo, false);
  assert.equal(updated.authSessionVersion?.version, 1);

  const owner = await prisma.user.create({ data: { nombre: 'Owner Assigned', email: `owner-assigned-${suffix}@example.invalid`, passwordHash: await hash('Synthetic Phase7B password', 4), rol: 'INMOBILIARIA', activo: true, emailVerifiedAt: new Date(), authSessionVersion: { create: { version: 0 } } } });
  await prisma.inmobiliaria.create({ data: { userId: owner.id, nombreAgencia: 'Already Assigned', cuit: `A-${suffix}`, direccion: 'Calle Assigned' } });
  await assert.rejects(createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Forbidden Reassignment', cuit: `R-${suffix}`, direccion: 'Calle Reassign', administrador: { nombre: owner.nombre, email: owner.email }, confirmExistingAccount: true }, { client: prisma, emailAdapter: mailbox([]) }), (error: unknown) => error instanceof AdministrativePolicyError && error.code === 'CONFLICT');
});

test('Phase 7B database conflicts send neither email nor copy-provider request', { skip: !enabled, timeout: 120_000 }, async () => {
  const admin = await createUser('ADMIN', 'admin-rollback');
  const owner = await prisma.user.create({ data: { nombre: 'Existing Owner', email: `existing-owner-${suffix}@example.invalid`, passwordHash: await hash('Synthetic Phase7B password', 4), rol: 'INMOBILIARIA', activo: true, emailVerifiedAt: new Date(), authSessionVersion: { create: { version: 0 } } } });
  await prisma.inmobiliaria.create({ data: { userId: owner.id, nombreAgencia: 'Existing CUIT', cuit: `D-${suffix}`, direccion: 'Calle Existing' } });
  const messages: AuthEmailMessage[] = [];
  const calls: InvitationCopyContext[] = [];
  await assert.rejects(createInmobiliariaWithAdministrator({ actorUserId: admin.id, nombreAgencia: 'Duplicate CUIT', cuit: `D-${suffix}`, direccion: 'Calle Duplicate', administrador: { nombre: 'Should Rollback', email: `rollback-${suffix}@example.invalid` } }, { client: prisma, emailAdapter: mailbox(messages), copyProvider: validCopyProvider(calls) }), AdministrativePolicyError);
  assert.equal(messages.length, 0);
  assert.equal(calls.length, 0);
  assert.equal(await prisma.user.count({ where: { email: `rollback-${suffix}@example.invalid` } }), 0);
});
