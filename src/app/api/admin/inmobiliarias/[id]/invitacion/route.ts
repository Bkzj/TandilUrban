import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { AdministrativePolicyError, resendAccountInvitation } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return runRouteHandler(request, 'admin.invitation_resend.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { user } = await requireGlobalAdmin();
    const rate = await configuredRateLimitStore().consume(
      `admin-invitation:user:${hashAuthSecret(user.id).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.invitationResendUser,
    );
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const { id } = await context.params;
    try {
      const result = await resendAccountInvitation({ actorUserId: user.id, inmobiliariaId: id }, { client: prisma, requestId });
      return NextResponse.json({
        message: result.invitationDeliverySucceeded ? 'Invitación reenviada.' : 'La invitación quedó pendiente de envío.',
        invitationDeliverySucceeded: result.invitationDeliverySucceeded,
        expiresAt: result.value.expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AdministrativePolicyError) {
        const code = error.code === 'NOT_FOUND' ? 'NOT_FOUND' : error.code === 'FORBIDDEN' ? 'FORBIDDEN' : 'CONFLICT';
        throw new ApiError(code, { message: error.message });
      }
      throw error;
    }
  });
}
