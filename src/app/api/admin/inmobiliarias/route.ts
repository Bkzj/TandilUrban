import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { createInmobiliariaSchema } from '@/lib/validation/admin';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { AdministrativePolicyError, createInmobiliariaWithAdministrator } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

function mapPolicyError(error: AdministrativePolicyError): ApiError {
  return new ApiError(error.code, { message: error.message });
}

export async function POST(request: Request) {
  return runRouteHandler(request, 'admin.inmobiliaria_create.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { user } = await requireGlobalAdmin();
    const rate = await configuredRateLimitStore().consume(
      `admin-mutation:user:${hashAuthSecret(user.id).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.adminMutationUser,
    );
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const payload = await parseJsonBody(request, createInmobiliariaSchema, REQUEST_LIMITS.authJsonBytes);
    try {
      const result = await createInmobiliariaWithAdministrator({ actorUserId: user.id, ...payload }, { client: prisma, requestId });
      return NextResponse.json({
        inmobiliariaId: result.value.inmobiliariaId,
        administratorId: result.value.administratorId,
        invitationId: result.value.invitationId,
        expiresAt: result.value.expiresAt.toISOString(),
        invitationDeliverySucceeded: result.invitationDeliverySucceeded,
        invitationCopySource: result.invitationCopySource,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof AdministrativePolicyError && error.reason === 'CONFIRM_EXISTING_ACCOUNT') {
        return NextResponse.json({
          error: error.message,
          code: 'CONFLICT',
          requiresExistingAccountConfirmation: true,
          requestId,
        }, { status: 409 });
      }
      if (error instanceof AdministrativePolicyError) throw mapPolicyError(error);
      throw error;
    }
  });
}
