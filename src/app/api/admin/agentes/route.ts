import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { inviteAgentSchema } from '@/lib/validation/admin';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { AdministrativePolicyError, inviteAgent } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request) {
  return runRouteHandler(request, 'admin.agent_create.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { user } = await requireGlobalAdmin();
    const rate = await configuredRateLimitStore().consume(`admin-mutation:user:${hashAuthSecret(user.id).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.adminMutationUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const payload = await parseJsonBody(request, inviteAgentSchema, REQUEST_LIMITS.authJsonBytes);
    if (!payload.inmobiliariaId) throw new ApiError('VALIDATION_ERROR', { message: 'Seleccioná una inmobiliaria.' });
    try {
      const result = await inviteAgent({ actorUserId: user.id, inmobiliariaId: payload.inmobiliariaId, nombre: payload.nombre, email: payload.email }, { client: prisma, requestId });
      return NextResponse.json({ agente: result.value, invitationDeliverySucceeded: result.invitationDeliverySucceeded }, { status: 201 });
    } catch (error) {
      if (error instanceof AdministrativePolicyError) throw new ApiError(error.code, { message: error.message });
      throw error;
    }
  });
}
