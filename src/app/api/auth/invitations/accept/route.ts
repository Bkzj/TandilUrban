import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { acceptAccountInvitationSchema } from '@/lib/validation/admin';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { acceptAccountInvitation } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.invitation_accept.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const rate = await configuredRateLimitStore().consume(`invitation-accept:ip:${requestIp(request)}`, AUTH_RATE_LIMIT_POLICIES.passwordResetConsumeIp);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const payload = await parseJsonBody(request, acceptAccountInvitationSchema, REQUEST_LIMITS.authJsonBytes);
    const result = await acceptAccountInvitation(payload.token, payload.password, { client: prisma, requestId });
    if (result.status !== 'accepted') throw new ApiError('VALIDATION_ERROR', { message: 'La invitación no es válida o venció.' });
    return NextResponse.json({ message: 'Cuenta activada. Ya podés iniciar sesión.' });
  });
}
