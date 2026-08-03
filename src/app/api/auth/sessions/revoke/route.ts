import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { revokeSessionSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import { revokeOtherUserSession } from '@/server/auth/session-management-service';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.sessions.revoke.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    const payload = await parseJsonBody(request, revokeSessionSchema, REQUEST_LIMITS.authJsonBytes);
    const rate = await configuredRateLimitStore().consume(
      `session-revoke:user:${hashAuthSecret(identity.userId).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.sessionRevokeUser,
    );
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const result = await revokeOtherUserSession({
      userId: identity.userId,
      currentSessionId: identity.authSessionId,
      targetSessionId: payload.sessionId,
      requestId,
    }, prisma);
    return NextResponse.json({ revoked: result === 'revoked', message: 'La sesión seleccionada ya no está activa.' });
  });
}
