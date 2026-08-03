import { hash } from 'bcryptjs';
import { Prisma, RolUsuario, type PrismaClient } from '@/generated/prisma';

import { createOpaqueToken, hashAuthSecret } from '@/lib/auth-security';
import { type AuthEmailAdapter, type AuthEmailProvider, sendAccountInvitationEmail } from '@/lib/mail';
import { serverLogger } from '@/lib/server-logger';
import { getServerEnvironment } from '@/lib/validation/environment';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import { canInviteAgent, canManageAccountStatus } from '@/server/admin/admin-policy';
import { configuredInvitationCopyProvider, resolveInvitationCopy, type InvitationCopyProvider } from '@/server/admin/invitation-copy';

function invitationExpiration(now: Date): { expiresAt: Date; expirationHours: number } {
  const expirationHours = getServerEnvironment().ACCOUNT_INVITATION_TTL_HOURS;
  return { expiresAt: new Date(now.getTime() + expirationHours * 60 * 60 * 1_000), expirationHours };
}

export type AdministrativeMutationResult<T> = {
  value: T;
  invitationDeliverySucceeded: boolean;
  invitationDeliveryProvider: AuthEmailProvider | 'unresolved';
  invitationCopySource: 'provider' | 'fallback';
};

class AdministrativePolicyError extends Error {
  readonly code: 'FORBIDDEN' | 'CONFLICT' | 'NOT_FOUND';
  readonly reason?: 'CONFIRM_EXISTING_ACCOUNT';
  constructor(code: 'FORBIDDEN' | 'CONFLICT' | 'NOT_FOUND', message: string, reason?: 'CONFIRM_EXISTING_ACCOUNT') {
    super(message);
    this.name = 'AdministrativePolicyError';
    this.code = code;
    this.reason = reason;
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
  input: { actorUserId: string; nombre: string; email: string; role: 'INMOBILIARIA' | 'AGENTE'; inmobiliariaId: string; now: Date; expiresAt: Date },
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
      expiresAt: input.expiresAt,
    },
  });
  return { user, rawToken };
}

type PendingInvitationDelivery = {
  invitationId: string;
  actorUserId: string;
  administratorId: string;
  email: string;
  administratorName: string;
  inmobiliariaId: string;
  inmobiliariaName: string;
  role: 'INMOBILIARIA' | 'AGENTE';
  rawToken: string;
  expirationHours: number;
  eventOnSuccess: 'ACCOUNT_INVITATION_SENT' | 'ACCOUNT_INVITATION_RESENT';
};

async function deliverInvitation(
  invitation: PendingInvitationDelivery,
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; copyProvider?: InvitationCopyProvider; requestId?: string; now?: Date },
): Promise<{ delivered: boolean; provider: AuthEmailProvider | 'unresolved'; copySource: 'provider' | 'fallback' }> {
  const now = options.now ?? new Date();
  const resolved = await resolveInvitationCopy({
    administratorDisplayName: invitation.administratorName,
    inmobiliariaName: invitation.inmobiliariaName,
    role: invitation.role,
  }, options.copyProvider ?? configuredInvitationCopyProvider());
  const input = {
    email: invitation.email,
    rawToken: invitation.rawToken,
    inmobiliariaName: invitation.inmobiliariaName,
    role: invitation.role,
    expirationHours: invitation.expirationHours,
    copy: resolved.copy,
  } as const;
  let delivery: Awaited<ReturnType<typeof sendAccountInvitationEmail>>;
  try {
    delivery = options.emailAdapter
      ? await sendAccountInvitationEmail(input, options.emailAdapter)
      : await sendAccountInvitationEmail(input);
  } catch {
    delivery = { ok: false, error: new Error('El proveedor de correo no está disponible.'), category: 'provider_unavailable' };
  }
  const delivered = delivery.ok && delivery.delivered;
  const provider = delivery.provider ?? (options.emailAdapter ? 'injected' : 'unresolved');
  const logContext = {
    requestId: options.requestId,
    provider,
    template: 'account_invitation',
    deliveryResult: delivered ? 'success' : 'failed',
    ...(!delivered && delivery.category ? { failureCategory: delivery.category } : {}),
  };
  if (delivered) serverLogger.info('auth.email.delivery', logContext);
  else serverLogger.warn('auth.email.delivery', logContext);
  await options.client.$transaction(async (tx) => {
    await tx.accountInvitation.update({
      where: { id: invitation.invitationId },
      data: delivered
        ? { deliveryStatus: 'SENT', lastDeliveryAttemptAt: now, sentAt: now }
        : { deliveryStatus: 'FAILED', lastDeliveryAttemptAt: now, sentAt: null },
    });
    await recordSecurityEvent({
      userId: invitation.administratorId,
      actorUserId: invitation.actorUserId,
      targetUserId: invitation.administratorId,
      targetInmobiliariaId: invitation.inmobiliariaId,
      type: delivered ? invitation.eventOnSuccess : 'ACCOUNT_INVITATION_SEND_FAILED',
      category: resolved.source,
      requestId: options.requestId,
    }, tx);
  });
  return { delivered, provider, copySource: resolved.source };
}

export async function createInmobiliariaWithAdministrator(
  input: { actorUserId: string; nombreAgencia: string; cuit: string; direccion: string; administrador: { nombre: string; email: string }; confirmExistingAccount?: boolean },
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; copyProvider?: InvitationCopyProvider; requestId?: string; now?: Date },
): Promise<AdministrativeMutationResult<{ inmobiliariaId: string; administratorId: string; invitationId: string; expiresAt: Date }>> {
  const now = options.now ?? new Date();
  const { expiresAt, expirationHours } = invitationExpiration(now);
  let invitation: PendingInvitationDelivery & { expiresAt: Date };
  try {
    invitation = await options.client.$transaction(async (tx) => {
      const actor = await activeActor(input.actorUserId, tx);
      if (actor.rol !== RolUsuario.ADMIN) throw new AdministrativePolicyError('FORBIDDEN', 'Se requiere administración global.');
      if (await tx.inmobiliaria.count({ where: { cuit: input.cuit } })) {
        throw new AdministrativePolicyError('CONFLICT', 'Ya existe una inmobiliaria con ese CUIT.');
      }

      const normalizedEmail = input.administrador.email.normalize('NFKC').trim().toLowerCase();
      const existing = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true, email: true, nombre: true, rol: true, agenciaId: true, inmobiliariaPerfil: { select: { id: true } } },
      });
      if (existing && (existing.rol !== RolUsuario.USUARIO_NORMAL || existing.agenciaId || existing.inmobiliariaPerfil)) {
        throw new AdministrativePolicyError('CONFLICT', 'La cuenta existente ya tiene un rol o una inmobiliaria asignada.');
      }
      if (existing && !input.confirmExistingAccount) {
        throw new AdministrativePolicyError('CONFLICT', 'Esta cuenta ya existe. Confirmá si querés asignarla como administradora.', 'CONFIRM_EXISTING_ACCOUNT');
      }
      const administrator = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { nombre: input.administrador.nombre, rol: RolUsuario.INMOBILIARIA, activo: false },
            select: { id: true, email: true, nombre: true },
          })
        : await tx.user.create({
            data: {
              nombre: input.administrador.nombre,
              email: normalizedEmail,
              passwordHash: await hash(createOpaqueToken(), 12),
              rol: RolUsuario.INMOBILIARIA,
              activo: false,
              emailVerifiedAt: null,
              authSessionVersion: { create: { version: 0 } },
            },
            select: { id: true, email: true, nombre: true },
          });
      const inmobiliaria = await tx.inmobiliaria.create({
        data: { userId: administrator.id, nombreAgencia: input.nombreAgencia, cuit: input.cuit, direccion: input.direccion },
        select: { id: true },
      });
      const rawToken = createOpaqueToken();
      if (existing) {
        await tx.authSessionVersion.upsert({ where: { userId: administrator.id }, create: { userId: administrator.id, version: 1 }, update: { version: { increment: 1 } } });
        await tx.authSession.updateMany({ where: { userId: administrator.id, revokedAt: null }, data: { revokedAt: now, revokedReason: 'TENANT_ASSIGNMENT' } });
        await tx.twoFactorChallenge.updateMany({ where: { userId: administrator.id, consumedAt: null }, data: { consumedAt: now } });
        await recordSecurityEvent({ userId: administrator.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'ROLE_CHANGED', category: 'normal_to_inmobiliaria', requestId: options.requestId }, tx);
        await recordSecurityEvent({ userId: administrator.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'TENANT_ASSIGNMENT_CHANGED', category: 'principal_administrator', requestId: options.requestId }, tx);
      }
      const createdInvitation = await tx.accountInvitation.create({
        data: {
          userId: administrator.id,
          createdById: actor.id,
          inmobiliariaId: inmobiliaria.id,
          intendedRole: RolUsuario.INMOBILIARIA,
          tokenHash: hashAuthSecret(rawToken),
          expiresAt,
        },
        select: { id: true },
      });
      await recordSecurityEvent({ userId: actor.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'INMOBILIARIA_CREATED', requestId: options.requestId }, tx);
      await recordSecurityEvent({ userId: administrator.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'INMOBILIARIA_ADMIN_CREATED', requestId: options.requestId }, tx);
      await recordSecurityEvent({ userId: administrator.id, actorUserId: actor.id, targetUserId: administrator.id, targetInmobiliariaId: inmobiliaria.id, type: 'ACCOUNT_INVITATION_CREATED', requestId: options.requestId }, tx);
      return { invitationId: createdInvitation.id, actorUserId: actor.id, rawToken, email: administrator.email, administratorName: administrator.nombre, inmobiliariaId: inmobiliaria.id, inmobiliariaName: input.nombreAgencia, administratorId: administrator.id, role: 'INMOBILIARIA' as const, expirationHours, eventOnSuccess: 'ACCOUNT_INVITATION_SENT' as const, expiresAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      throw new AdministrativePolicyError('CONFLICT', 'La inmobiliaria o la cuenta ya existen.');
    }
    throw error;
  }
  const delivery = await deliverInvitation(invitation, options);
  return {
    value: { inmobiliariaId: invitation.inmobiliariaId, administratorId: invitation.administratorId, invitationId: invitation.invitationId, expiresAt: invitation.expiresAt },
    invitationDeliverySucceeded: delivery.delivered,
    invitationDeliveryProvider: delivery.provider,
    invitationCopySource: delivery.copySource,
  };
}

export async function inviteAgent(
  input: { actorUserId: string; inmobiliariaId: string; nombre: string; email: string },
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; copyProvider?: InvitationCopyProvider; requestId?: string; now?: Date },
): Promise<AdministrativeMutationResult<{ id: string; nombre: string; email: string; rol: string; activo: boolean; createdAt: Date }>> {
  const now = options.now ?? new Date();
  const { expiresAt, expirationHours } = invitationExpiration(now);
  const created = await options.client.$transaction(async (tx) => {
    const actor = await activeActor(input.actorUserId, tx);
    const allowed = canInviteAgent({ id: actor.id, rol: actor.rol, activo: actor.activo, tenantId: actor.inmobiliariaPerfil?.id ?? null }, input.inmobiliariaId);
    if (!allowed) throw new AdministrativePolicyError('FORBIDDEN', 'No podés crear agentes para esta inmobiliaria.');
    const tenant = await tx.inmobiliaria.findUnique({ where: { id: input.inmobiliariaId }, select: { nombreAgencia: true } });
    if (!tenant) {
      throw new AdministrativePolicyError('NOT_FOUND', 'Inmobiliaria no encontrada.');
    }
    const result = await createInvitedUser({ ...input, role: 'AGENTE', now, expiresAt }, tx);
    await recordSecurityEvent({ userId: result.user.id, actorUserId: actor.id, targetUserId: result.user.id, targetInmobiliariaId: input.inmobiliariaId, type: 'AGENT_CREATED', requestId: options.requestId }, tx);
    await recordSecurityEvent({ userId: result.user.id, actorUserId: actor.id, targetUserId: result.user.id, targetInmobiliariaId: input.inmobiliariaId, type: 'TENANT_ASSIGNMENT_CHANGED', category: 'agent_invited', requestId: options.requestId }, tx);
    const invitation = await tx.accountInvitation.findFirstOrThrow({ where: { userId: result.user.id }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    await recordSecurityEvent({ userId: result.user.id, actorUserId: actor.id, targetUserId: result.user.id, targetInmobiliariaId: input.inmobiliariaId, type: 'ACCOUNT_INVITATION_CREATED', requestId: options.requestId }, tx);
    return { ...result.user, invitationId: invitation.id, inmobiliariaName: tenant.nombreAgencia, rawToken: result.rawToken };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const delivery = await deliverInvitation({ invitationId: created.invitationId, actorUserId: input.actorUserId, administratorId: created.id, email: created.email, administratorName: created.nombre, inmobiliariaId: input.inmobiliariaId, inmobiliariaName: created.inmobiliariaName, role: 'AGENTE', rawToken: created.rawToken, expirationHours, eventOnSuccess: 'ACCOUNT_INVITATION_SENT' }, options);
  const value = { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol, activo: created.activo, createdAt: created.createdAt };
  return { value, invitationDeliverySucceeded: delivery.delivered, invitationDeliveryProvider: delivery.provider, invitationCopySource: delivery.copySource };
}

export async function resendAccountInvitation(
  input: { actorUserId: string; inmobiliariaId: string },
  options: { client: PrismaClient; emailAdapter?: AuthEmailAdapter; copyProvider?: InvitationCopyProvider; requestId?: string; now?: Date },
): Promise<AdministrativeMutationResult<{ invitationId: string; expiresAt: Date }>> {
  const now = options.now ?? new Date();
  const { expiresAt, expirationHours } = invitationExpiration(now);
  const pending = await options.client.$transaction(async (tx) => {
    const actor = await activeActor(input.actorUserId, tx);
    if (actor.rol !== RolUsuario.ADMIN) throw new AdministrativePolicyError('FORBIDDEN', 'Se requiere administración global.');
    const tenant = await tx.inmobiliaria.findUnique({ where: { id: input.inmobiliariaId }, select: { id: true, nombreAgencia: true, user: { select: { id: true, nombre: true, email: true, activo: true } } } });
    if (!tenant) throw new AdministrativePolicyError('NOT_FOUND', 'Inmobiliaria no encontrada.');
    if (tenant.user.activo) throw new AdministrativePolicyError('CONFLICT', 'El administrador ya activó su cuenta.');
    await tx.accountInvitation.updateMany({ where: { userId: tenant.user.id, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
    const rawToken = createOpaqueToken();
    const invitation = await tx.accountInvitation.create({ data: { userId: tenant.user.id, createdById: actor.id, inmobiliariaId: tenant.id, intendedRole: RolUsuario.INMOBILIARIA, tokenHash: hashAuthSecret(rawToken), expiresAt }, select: { id: true } });
    await recordSecurityEvent({ userId: tenant.user.id, actorUserId: actor.id, targetUserId: tenant.user.id, targetInmobiliariaId: tenant.id, type: 'ACCOUNT_INVITATION_RESENT', requestId: options.requestId }, tx);
    return { invitationId: invitation.id, actorUserId: actor.id, administratorId: tenant.user.id, email: tenant.user.email, administratorName: tenant.user.nombre, inmobiliariaId: tenant.id, inmobiliariaName: tenant.nombreAgencia, role: 'INMOBILIARIA' as const, rawToken, expirationHours, eventOnSuccess: 'ACCOUNT_INVITATION_SENT' as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const delivery = await deliverInvitation(pending, options);
  return { value: { invitationId: pending.invitationId, expiresAt }, invitationDeliverySucceeded: delivery.delivered, invitationDeliveryProvider: delivery.provider, invitationCopySource: delivery.copySource };
}

export async function getAccountInvitationPublicContext(
  rawToken: string,
  options: { client: PrismaClient; now?: Date },
): Promise<{ inmobiliariaName: string; role: 'INMOBILIARIA' | 'AGENTE' } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(rawToken)) return null;
  const invitation = await options.client.accountInvitation.findUnique({
    where: { tokenHash: hashAuthSecret(rawToken) },
    select: { intendedRole: true, expiresAt: true, consumedAt: true, invalidatedAt: true, inmobiliaria: { select: { nombreAgencia: true } } },
  });
  const now = options.now ?? new Date();
  if (!invitation || invitation.consumedAt || invitation.invalidatedAt || invitation.expiresAt <= now) return null;
  return { inmobiliariaName: invitation.inmobiliaria.nombreAgencia, role: invitation.intendedRole as 'INMOBILIARIA' | 'AGENTE' };
}

export async function acceptAccountInvitation(
  rawToken: string,
  password: string,
  options: { client: PrismaClient; requestId?: string; now?: Date },
): Promise<{ status: 'accepted' | 'invalid' }> {
  const now = options.now ?? new Date();
  const passwordHash = await hash(password, 12);
  try {
    return await options.client.$transaction(async (tx) => {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return { status: 'invalid' };
    throw error;
  }
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
