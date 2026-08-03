import { hash } from 'bcryptjs';
import { Prisma, RolUsuario, type PrismaClient } from '@/generated/prisma';

import { createOpaqueToken, hashAuthSecret } from '@/lib/auth-security';
import { type AuthEmailAdapter, sendAccountInvitationEmail } from '@/lib/mail';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import { canInviteAgent, canManageAccountStatus } from '@/server/admin/admin-policy';

const INVITATION_TTL_MS = 24 * 60 * 60 * 1_000;

export type AdministrativeMutationResult<T> = {
  value: T;
  invitationDeliverySucceeded: boolean;
};

class AdministrativePolicyError extends Error {
  readonly code: 'FORBIDDEN' | 'CONFLICT' | 'NOT_FOUND';
  constructor(code: 'FORBIDDEN' | 'CONFLICT' | 'NOT_FOUND', message: string) {
    super(message);
    this.name = 'AdministrativePolicyError';
    this.code = code;
  }
}

export { AdministrativePolicyError };

async function activeActor(actorUserId: string, tx: Prisma.TransactionClient) {
  const actor = await tx.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, rol: true, activo: true, inmobiliariaPerfil: { select: { id: true } } },
  });
  if (!actor?.activo) throw new AdministrativePolicyError('FORBIDDEN', 'La sesión administrativa no es válida.');
  return actor;
}

async function createInvitedUser(
  input: { actorUserId: string; nombre: string; email: string; role: 'INMOBILIARIA' | 'AGENTE'; inmobiliariaId: string; now: Date },
  tx: Prisma.TransactionClient,
) {
  const normalizedEmail = input.email.normalize('NFKC').trim().toLowerCase();
  const existing = await tx.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } }, select: { id: true } });
  if (existing) throw new AdministrativePolicyError('CONFLICT', 'Ya existe una cuenta con ese email.');

  const rawToken = createOpaqueToken();
  const passwordHash = await hash(createOpaqueToken(), 12);
  const user = await tx.user.create({
    data: {
      nombre: input.nombre,
      email: normalizedEmail,
      passwordHash,
      rol: input.role,
      activo: false,
      emailVerifiedAt: null,
      twoFactorEnabled: false,
      ...(input.role === 'AGENTE' ? { agenciaId: input.inmobiliariaId } : {}),
      authSessionVersion: { create: { version: 0 } },
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
  });
  await tx.accountInvitation.create({
    data: {
      userId: user.id,
      createdById: input.actorUserId,
      inmobiliariaId: input.inmobiliariaId,
      intendedRole: input.role,
      tokenHash: hashAuthSecret(rawToken),
      expiresAt: new Date(input.now.getTime() + INVITATION_TTL_MS),
    },
  });
  return { user, rawToken };
}

export async function createInmobiliariaWithAdministrator(
  input: { actorUserId: string; nombreAgencia: string; cuit: string; direccion: string; administrador: { nombre: string; email: string } },
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; requestId?: string; now?: Date },
): Promise<AdministrativeMutationResult<{ inmobiliariaId: string; administratorId: string }>> {
  const now = options.now ?? new Date();
  let invitation: { rawToken: string; email: string; inmobiliariaId: string; administratorId: string };
  try {
    invitation = await options.client.$transaction(async (tx) => {
      const actor = await activeActor(input.actorUserId, tx);
      if (actor.rol !== RolUsuario.ADMIN) throw new AdministrativePolicyError('FORBIDDEN', 'Se requiere administración global.');
      if (await tx.inmobiliaria.count({ where: { cuit: input.cuit } })) {
        throw new AdministrativePolicyError('CONFLICT', 'Ya existe una inmobiliaria con ese CUIT.');
      }

      const normalizedEmail = input.administrador.email.normalize('NFKC').trim().toLowerCase();
      if (await tx.user.count({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } } })) {
        throw new AdministrativePolicyError('CONFLICT', 'Ya existe una cuenta con ese email.');
      }
      const placeholderHash = await hash(createOpaqueToken(), 12);
      const administrator = await tx.user.create({
        data: {
          nombre: input.administrador.nombre,
          email: normalizedEmail,
          passwordHash: placeholderHash,
          rol: RolUsuario.INMOBILIARIA,
          activo: false,
          emailVerifiedAt: null,
          authSessionVersion: { create: { version: 0 } },
        },
        select: { id: true, email: true },
      });
      const inmobiliaria = await tx.inmobiliaria.create({
        data: { userId: administrator.id, nombreAgencia: input.nombreAgencia, cuit: input.cuit, direccion: input.direccion },
        select: { id: true },
      });
      const rawToken = createOpaqueToken();
      await tx.accountInvitation.create({
        data: {
          userId: administrator.id,
          createdById: actor.id,
          inmobiliariaId: inmobiliaria.id,
          intendedRole: RolUsuario.INMOBILIARIA,
          tokenHash: hashAuthSecret(rawToken),
          expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
        },
      });
      await recordSecurityEvent({ userId: actor.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'INMOBILIARIA_CREATED', requestId: options.requestId }, tx);
      await recordSecurityEvent({ userId: administrator.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'INMOBILIARIA_ADMIN_CREATED', requestId: options.requestId }, tx);
      return { rawToken, email: administrator.email, inmobiliariaId: inmobiliaria.id, administratorId: administrator.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      throw new AdministrativePolicyError('CONFLICT', 'La inmobiliaria o la cuenta ya existen.');
    }
    throw error;
  }
  const delivery = options.emailAdapter
    ? await sendAccountInvitationEmail(invitation.email, invitation.rawToken, 'administrador de inmobiliaria', options.emailAdapter)
    : await sendAccountInvitationEmail(invitation.email, invitation.rawToken, 'administrador de inmobiliaria');
  return {
    value: { inmobiliariaId: invitation.inmobiliariaId, administratorId: invitation.administratorId },
    invitationDeliverySucceeded: delivery.ok && delivery.delivered,
  };
}

export async function inviteAgent(
  input: { actorUserId: string; inmobiliariaId: string; nombre: string; email: string },
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; requestId?: string; now?: Date },
): Promise<AdministrativeMutationResult<{ id: string; nombre: string; email: string; rol: string; activo: boolean; createdAt: Date }>> {
  const now = options.now ?? new Date();
  const created = await options.client.$transaction(async (tx) => {
    const actor = await activeActor(input.actorUserId, tx);
    const allowed = canInviteAgent({ id: actor.id, rol: actor.rol, activo: actor.activo, tenantId: actor.inmobiliariaPerfil?.id ?? null }, input.inmobiliariaId);
    if (!allowed) throw new AdministrativePolicyError('FORBIDDEN', 'No podés crear agentes para esta inmobiliaria.');
    if (!(await tx.inmobiliaria.count({ where: { id: input.inmobiliariaId } }))) {
      throw new AdministrativePolicyError('NOT_FOUND', 'Inmobiliaria no encontrada.');
    }
    const result = await createInvitedUser({ ...input, role: 'AGENTE', now }, tx);
    await recordSecurityEvent({ userId: result.user.id, actorUserId: actor.id, targetUserId: result.user.id, targetInmobiliariaId: input.inmobiliariaId, type: 'AGENT_CREATED', requestId: options.requestId }, tx);
    await recordSecurityEvent({ userId: result.user.id, actorUserId: actor.id, targetUserId: result.user.id, targetInmobiliariaId: input.inmobiliariaId, type: 'TENANT_ASSIGNMENT_CHANGED', category: 'agent_invited', requestId: options.requestId }, tx);
    return { ...result.user, rawToken: result.rawToken };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const delivery = options.emailAdapter
    ? await sendAccountInvitationEmail(created.email, created.rawToken, 'agente', options.emailAdapter)
    : await sendAccountInvitationEmail(created.email, created.rawToken, 'agente');
  const value = { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol, activo: created.activo, createdAt: created.createdAt };
  return { value, invitationDeliverySucceeded: delivery.ok && delivery.delivered };
}

export async function acceptAccountInvitation(
  rawToken: string,
  password: string,
  options: { client: PrismaClient; requestId?: string; now?: Date },
): Promise<{ status: 'accepted' | 'invalid' }> {
  const now = options.now ?? new Date();
  const passwordHash = await hash(password, 12);
  return options.client.$transaction(async (tx) => {
    const invitation = await tx.accountInvitation.findUnique({
      where: { tokenHash: hashAuthSecret(rawToken) },
      select: { id: true, userId: true, intendedRole: true, inmobiliariaId: true, consumedAt: true, invalidatedAt: true, expiresAt: true },
    });
    if (!invitation || invitation.consumedAt || invitation.invalidatedAt || invitation.expiresAt <= now) return { status: 'invalid' };
    const consumed = await tx.accountInvitation.updateMany({
      where: { id: invitation.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) return { status: 'invalid' };
    const updated = await tx.user.updateMany({
      where: {
        id: invitation.userId,
        rol: invitation.intendedRole,
        ...(invitation.intendedRole === RolUsuario.AGENTE ? { agenciaId: invitation.inmobiliariaId } : {}),
      },
      data: { passwordHash, emailVerifiedAt: now, activo: true, passwordChangedAt: now },
    });
    if (updated.count !== 1) throw new AdministrativePolicyError('CONFLICT', 'La asignación de la invitación cambió.');
    await tx.accountInvitation.updateMany({
      where: { userId: invitation.userId, id: { not: invitation.id }, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.authSessionVersion.upsert({ where: { userId: invitation.userId }, create: { userId: invitation.userId, version: 1 }, update: { version: { increment: 1 } } });
    await tx.authSession.updateMany({ where: { userId: invitation.userId, revokedAt: null }, data: { revokedAt: now, revokedReason: 'INVITATION_ACCEPTED' } });
    await tx.twoFactorChallenge.updateMany({ where: { userId: invitation.userId, consumedAt: null }, data: { consumedAt: now } });
    await recordSecurityEvent({ userId: invitation.userId, targetUserId: invitation.userId, targetInmobiliariaId: invitation.inmobiliariaId, type: 'ACCOUNT_INVITATION_ACCEPTED', requestId: options.requestId }, tx);
    await recordSecurityEvent({ userId: invitation.userId, targetUserId: invitation.userId, type: 'ACCOUNT_ACTIVATED', category: 'invitation', requestId: options.requestId }, tx);
    return { status: 'accepted' };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function setManagedAccountActive(
  input: { actorUserId: string; targetUserId: string; activo: boolean },
  options: { client: PrismaClient; requestId?: string; now?: Date },
): Promise<{ changed: boolean }> {
  const now = options.now ?? new Date();
  return options.client.$transaction(async (tx) => {
    const actor = await activeActor(input.actorUserId, tx);
    const target = await tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true, rol: true, activo: true, emailVerifiedAt: true, agenciaId: true } });
    if (!target) throw new AdministrativePolicyError('NOT_FOUND', 'Cuenta no encontrada.');
    if (target.rol === RolUsuario.ADMIN || target.id === actor.id) {
      throw new AdministrativePolicyError('FORBIDDEN', 'Esta cuenta no puede administrarse desde el panel.');
    }
    const allowed = canManageAccountStatus(
      { id: actor.id, rol: actor.rol, activo: actor.activo, tenantId: actor.inmobiliariaPerfil?.id ?? null },
      { id: target.id, rol: target.rol, tenantId: target.agenciaId },
    );
    if (!allowed) throw new AdministrativePolicyError('FORBIDDEN', 'No podés administrar esta cuenta.');
    if (input.activo && !target.emailVerifiedAt) throw new AdministrativePolicyError('CONFLICT', 'La cuenta debe completar su invitación antes de activarse.');
    if (target.activo === input.activo) return { changed: false };
    const changed = await tx.user.updateMany({ where: { id: target.id, activo: target.activo }, data: { activo: input.activo } });
    if (changed.count !== 1) throw new AdministrativePolicyError('CONFLICT', 'La cuenta cambió durante la operación.');
    await tx.authSessionVersion.upsert({ where: { userId: target.id }, create: { userId: target.id, version: 1 }, update: { version: { increment: 1 } } });
    await tx.authSession.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: now, revokedReason: input.activo ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DISABLED' } });
    await tx.twoFactorChallenge.updateMany({ where: { userId: target.id, consumedAt: null }, data: { consumedAt: now } });
    await recordSecurityEvent({ userId: target.id, actorUserId: actor.id, targetUserId: target.id, type: input.activo ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', requestId: options.requestId }, tx);
    return { changed: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
