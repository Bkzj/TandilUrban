import { RolUsuario } from '@prisma/client';
import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { requireTenantAdministrator } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { accountStatusSchema, inviteAgentSchema } from '@/lib/validation/admin';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { AdministrativePolicyError, inviteAgent, setManagedAccountActive } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export async function GET(request: Request) {
  return runRouteHandler(request, 'panel.team_list.failed', async () => {
    const { inmobiliariaId } = await requireTenantAdministrator();
    const agentes = await prisma.user.findMany({
      where: { agenciaId: inmobiliariaId, rol: RolUsuario.AGENTE },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
        emailVerifiedAt: true,
        activo: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ agentes });
  });
}
export async function POST(request: Request) {
  return runRouteHandler(request, 'panel.team_create.failed', async () => {
    assertTrustedMutationRequest(request);
    const { inmobiliariaId, user } = await requireTenantAdministrator();
    const rate = await configuredRateLimitStore().consume(`tenant-mutation:user:${hashAuthSecret(user.id).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.tenantMutationUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const payload = await parseJsonBody(request, inviteAgentSchema, REQUEST_LIMITS.authJsonBytes);
    try {
      const result = await inviteAgent({ actorUserId: user.id, inmobiliariaId, nombre: payload.nombre, email: payload.email }, { client: prisma });
      return NextResponse.json({ agente: result.value, invitationDeliverySucceeded: result.invitationDeliverySucceeded }, { status: 201 });
    } catch (error) {
      if (error instanceof AdministrativePolicyError) throw new ApiError(error.code, { message: error.message });
      throw error;
    }
  });
}

export async function PATCH(request: Request) {
  return runRouteHandler(request, 'panel.team_status.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { user } = await requireTenantAdministrator();
    const payload = await parseJsonBody(request, accountStatusSchema, REQUEST_LIMITS.authJsonBytes);
    const rate = await configuredRateLimitStore().consume(`tenant-mutation:user:${hashAuthSecret(user.id).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.tenantMutationUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    try {
      const result = await setManagedAccountActive({ actorUserId: user.id, targetUserId: payload.userId, activo: payload.activo }, { client: prisma, requestId });
      return NextResponse.json({ ok: true, changed: result.changed });
    } catch (error) {
      if (error instanceof AdministrativePolicyError) throw new ApiError(error.code, { message: error.message });
      throw error;
    }
  });
}
